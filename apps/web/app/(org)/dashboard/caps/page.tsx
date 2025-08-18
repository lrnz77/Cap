// apps/web/app/(org)/dashboard/caps/page.tsx
import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import {
  comments,
  folders,
  organizations,
  sharedVideos,
  spaceVideos,
  spaces,
  users,
  videos,
} from "@cap/database/schema";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Caps } from "./Caps";
import { serverEnv } from "@cap/env";

export const metadata: Metadata = {
  title: "My Caps — Cap",
};

// Carica gli spazi condivisi (sia space che org) per un set di video
async function getSharedSpacesForVideos(videoIds: string[]) {
  if (videoIds.length === 0) return {} as Record<
    string,
    Array<{ id: string; name: string; organizationId: string; iconUrl: string | null; isOrg: boolean }>
  >;

  // Condivisione a livello space
  const spaceSharing = await db()
    .select({
      videoId: spaceVideos.videoId,
      id: spaces.id,
      name: spaces.name,
      organizationId: spaces.organizationId,
      iconUrl: organizations.iconUrl,
    })
    .from(spaceVideos)
    .innerJoin(spaces, eq(spaceVideos.spaceId, spaces.id))
    .innerJoin(organizations, eq(spaces.organizationId, organizations.id))
    .where(sql`${spaceVideos.videoId} IN (${sql.join(videoIds.map((v) => sql`${v}`), sql`, `)})`);

  // Condivisione a livello organizzazione
  const orgSharing = await db()
    .select({
      videoId: sharedVideos.videoId,
      id: organizations.id,
      name: organizations.name,
      organizationId: organizations.id,
      iconUrl: organizations.iconUrl,
    })
    .from(sharedVideos)
    .innerJoin(organizations, eq(sharedVideos.organizationId, organizations.id))
    .where(sql`${sharedVideos.videoId} IN (${sql.join(videoIds.map((v) => sql`${v}`), sql`, `)})`);

  const map: Record<
    string,
    Array<{ id: string; name: string; organizationId: string; iconUrl: string | null; isOrg: boolean }>
  > = {};

  for (const s of spaceSharing) {
    (map[s.videoId] ||= []).push({
      id: s.id,
      name: s.name,
      organizationId: s.organizationId,
      iconUrl: s.iconUrl ?? null,
      isOrg: false,
    });
  }
  for (const o of orgSharing) {
    (map[o.videoId] ||= []).push({
      id: o.id,
      name: o.name,
      organizationId: o.organizationId,
      iconUrl: o.iconUrl ?? null,
      isOrg: true,
    });
  }

  return map;
}

export default async function CapsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/login");
  if (!user.name || user.name.length <= 1) redirect("/onboarding");

  const userId = user.id;
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 15;
  const offset = (page - 1) * limit;

  // Conteggio totale
  const totalCountResult = await db()
    .select({ count: count() })
    .from(videos)
    .where(eq(videos.ownerId, userId));
  const totalCount = Number(totalCountResult[0]?.count ?? 0);

  // Dati dominio custom dell’organizzazione
  const orgRow = await db()
    .select({
      customDomain: organizations.customDomain,
      domainVerified: organizations.domainVerified,
    })
    .from(organizations)
    .where(eq(organizations.id, user.activeOrganizationId))
    .limit(1);

  const customDomain = orgRow[0]?.customDomain ?? null;
  const domainVerified = orgRow[0]?.domainVerified != null;

  // Query principale semplificata: niente JSON_ARRAYAGG
  const videoRows = await db()
    .select({
      id: videos.id,
      ownerId: videos.ownerId,
      name: videos.name,
      createdAt: videos.createdAt,
      metadata: videos.metadata,
      public: videos.public,
      thumbnailUrl: videos.thumbnailUrl,   // <— usato per la thumb
      isScreenshot: videos.isScreenshot,   // <— flag eventuale UI
      ownerName: users.name,
      totalComments: sql<number>`COUNT(DISTINCT CASE WHEN ${comments.type} = 'text' THEN ${comments.id} END)`,
      totalReactions: sql<number>`COUNT(DISTINCT CASE WHEN ${comments.type} = 'emoji' THEN ${comments.id} END)`,
      effectiveDate: sql<string>`
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(${videos.metadata}, '$.customCreatedAt')),
          ${videos.createdAt}
        )
      `,
      hasPassword: sql<number>`IF(${videos.password} IS NULL, 0, 1)`,
    })
    .from(videos)
    .leftJoin(comments, eq(videos.id, comments.videoId))
    .leftJoin(users, eq(videos.ownerId, users.id))
    .where(and(eq(videos.ownerId, userId), isNull(videos.folderId)))
    .groupBy(
      videos.id,
      videos.ownerId,
      videos.name,
      videos.createdAt,
      videos.metadata,
      users.name,
      videos.thumbnailUrl,
      videos.isScreenshot
    )
    .orderBy(
      desc(sql`COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(${videos.metadata}, '$.customCreatedAt')),
        ${videos.createdAt}
      )`)
    )
    .limit(limit)
    .offset(offset);

  // Cartelle root
  const foldersData = await db()
    .select({
      id: folders.id,
      name: folders.name,
      color: folders.color,
      parentId: folders.parentId,
      videoCount: sql<number>`(SELECT COUNT(*) FROM ${videos} WHERE ${videos.folderId} = ${folders.id})`,
    })
    .from(folders)
    .where(
      and(
        eq(folders.organizationId, user.activeOrganizationId),
        isNull(folders.parentId),
        isNull(folders.spaceId)
      )
    );

  // Spazi condivisi per tutti i video mostrati
  const videoIds = videoRows.map((v) => v.id);
  const sharedSpacesMap = await getSharedSpacesForVideos(videoIds);

  // Normalizzazione dati per la UI
  const processedVideoData = videoRows.map((v) => ({
    id: v.id,
    ownerId: v.ownerId,
    name: v.name,
    createdAt: v.createdAt,
    public: !!v.public,
    totalComments: Number(v.totalComments ?? 0),
    totalReactions: Number(v.totalReactions ?? 0),
    ownerName: v.ownerName ?? "",
    metadata: (v.metadata as any) ?? {},          // <-- mai undefined
    hasPassword: v.hasPassword === 1,
    // campi per la thumb
    // la CapCard/VideoThumbnail potrà usarli
    // (se hai un componente che vuole solo userId/videoId va comunque bene)
    // li lasciamo qui per eventuali usi futuri
    // @ts-expect-error: field present in select
    thumbnailUrl: v.thumbnailUrl ?? null,
    // @ts-expect-error: field present in select
    isScreenshot: v.isScreenshot ?? 0,
    // condivisioni
    sharedOrganizations: [] as { id: string; name: string; iconUrl?: string | null }[],
    sharedSpaces: sharedSpacesMap[v.id] ?? [],
    foldersData,
  }));

  return (
    <Caps
      data={processedVideoData as any}
      folders={foldersData}
      customDomain={customDomain}
      domainVerified={domainVerified}
      count={totalCount}
      dubApiKeyEnabled={!!serverEnv().DUB_API_KEY}
    />
  );
}
