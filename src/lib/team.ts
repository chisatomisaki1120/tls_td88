import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type DbLike = typeof db | Prisma.TransactionClient;

export const teamSummarySelect = Prisma.validator<Prisma.TeamSelect>()({
  id: true,
  name: true,
  leaderId: true,
  leader: { select: { id: true, username: true } },
  members: { where: { role: "staff" }, select: { id: true, username: true } },
  _count: { select: { members: true } },
});

export const userSummarySelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  username: true,
  role: true,
  isActive: true,
  teamId: true,
  team: { select: { id: true, name: true, leaderId: true, leader: { select: { id: true, username: true } } } },
  _count: { select: { assignedRecords: true } },
});

export function withRecordCount<T extends { _count: { assignedRecords: number } }>(item: T) {
  return { ...item, recordCount: item._count.assignedRecords };
}

export async function findLeadingTeam(userId: string, client: DbLike = db) {
  return client.team.findFirst({ where: { leaderId: userId }, select: { id: true } });
}

export async function resolveTeamLeadIdForUser(userId: string, client: DbLike = db) {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      team: { select: { leaderId: true } },
      leadingTeam: { select: { id: true } },
    },
  });

  if (!user) return null;
  return user.team?.leaderId || (user.leadingTeam ? user.id : null);
}

export const resolveManagedLeaderId = resolveTeamLeadIdForUser;
