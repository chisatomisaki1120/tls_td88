import assert from "node:assert/strict";
import { db } from "@/lib/db";
import { buildPhoneRecordScope, buildStaffScope, canAccessRecord, canAssignRecord, canManageUsers, isTeamLeader } from "@/lib/permissions";
import { resolveTeamLeadIdForUser } from "@/lib/team";

async function main() {
  const admin = await db.user.findUnique({ where: { username: "admin" } });
  const leader1 = await db.user.findUnique({ where: { username: "leader1" } });
  const staffA = await db.user.findUnique({ where: { username: "staffa" } });
  const staffB = await db.user.findUnique({ where: { username: "staffb" } });

  assert(admin && leader1 && staffA && staffB, "Missing seeded users");

  assert.equal(await isTeamLeader(leader1.id), true, "leader1 should be team leader by team.leaderId");
  assert.equal(await canManageUsers(admin.role, admin.id), true, "admin can manage users");
  assert.equal(await canManageUsers(leader1.role, leader1.id), true, "team lead staff can manage team users");
  assert.equal(await canManageUsers(staffA.role, staffA.id), false, "regular staff cannot manage users");

  assert.equal(await canAssignRecord(admin.role, admin.id, staffA.id), true, "admin can assign any staff");
  assert.equal(await canAssignRecord(leader1.role, leader1.id, staffA.id), true, "team lead can assign staff in own team");
  assert.equal(await canAssignRecord(leader1.role, leader1.id, leader1.id), true, "team lead can assign to self as staff");
  assert.equal(await canAssignRecord(staffA.role, staffA.id, staffB.id), false, "regular staff cannot assign records");

  const assignedToA = await db.phoneRecord.findFirstOrThrow({ where: { assignedStaffId: staffA.id } });
  const assignedToB = await db.phoneRecord.findFirstOrThrow({ where: { assignedStaffId: staffB.id } });
  const unassignedInTeam = await db.phoneRecord.findFirstOrThrow({ where: { assignedStaffId: null, leaderId: leader1.id } });

  assert.equal(await canAccessRecord(admin.role, admin.id, assignedToA), true, "admin can access any record");
  assert.equal(await canAccessRecord(leader1.role, leader1.id, assignedToA), true, "team lead can access team record");
  assert.equal(await canAccessRecord(staffA.role, staffA.id, assignedToA), true, "staff can access own record");
  assert.equal(await canAccessRecord(staffA.role, staffA.id, assignedToB), false, "staff cannot access another staff record");
  assert.equal(await canAccessRecord(staffA.role, staffA.id, unassignedInTeam), false, "staff cannot access unassigned team record");

  const leaderScope = await buildPhoneRecordScope({ role: leader1.role, id: leader1.id });
  const staffScope = await buildPhoneRecordScope({ role: staffA.role, id: staffA.id });
  const leaderVisibleCount = await db.phoneRecord.count({ where: { AND: [leaderScope] } });
  const staffVisibleCount = await db.phoneRecord.count({ where: { AND: [staffScope] } });
  assert.equal(leaderVisibleCount, 3, "team lead should see all 3 seeded team records");
  assert.equal(staffVisibleCount, 1, "staffA should see only own assigned record");

  const leaderStaffScope = await buildStaffScope({ role: leader1.role, id: leader1.id });
  const leaderVisibleStaff = await db.user.findMany({ where: leaderStaffScope, orderBy: { username: "asc" }, select: { username: true } });
  assert.deepEqual(leaderVisibleStaff.map((item) => item.username), ["staffa", "staffb"], "team lead should see only members in own team");

  assert.equal(await resolveTeamLeadIdForUser(staffA.id), leader1.id, "staffA should resolve to leader1");
  assert.equal(await resolveTeamLeadIdForUser(leader1.id), leader1.id, "team lead should resolve to self");

  console.log("permission tests passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
