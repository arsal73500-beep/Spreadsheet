import { isAdminEmail, resolveEffectiveRole, updateUserRole, recordUserSignIn, getUsersList } from "../src/lib/user-store";
import { hasPermission, ROLE_PERMISSIONS, UserRole } from "../src/lib/auth";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  BACKLINK MANAGER: UNIFIED AUTH SYSTEM TEST SUITE");
  console.log("=======================================================\n");

  // 1. ADMIN ALLOWLIST TESTS
  console.log("1. ADMIN_EMAILS Allowlist Verification");
  process.env.ADMIN_EMAILS = "owner@example.com,admin@mdhealth.com,arsal73500@gmail.com";

  assert(isAdminEmail("owner@example.com"), "Exact match allowlist email is admin");
  assert(isAdminEmail("ADMIN@MDHEALTH.COM"), "Case-insensitive allowlist match is admin");
  assert(isAdminEmail("  arsal73500@gmail.com  "), "Trimmed email match is admin");
  assert(!isAdminEmail("hacker@malicious.com"), "Unlisted email is not admin");
  assert(!isAdminEmail(""), "Empty email is not admin");
  assert(!isAdminEmail(null as any), "Null email is not admin");

  // 2. ROLE RESOLUTION & PRIVILEGE ESCALATION PREVENTION
  console.log("\n2. Role Resolution & Privilege Escalation Prevention");
  assert(
    resolveEffectiveRole("owner@example.com", "viewer") === "admin",
    "Allowlisted email is always resolved as 'admin' even if stored role says viewer"
  );
  assert(
    resolveEffectiveRole("viewer@partner.com", "admin") === "editor",
    "Unlisted email stored as 'admin' is demoted to 'editor' (self-promotion revoked)"
  );
  assert(
    resolveEffectiveRole("editor@partner.com", "editor") === "editor",
    "Unlisted email stored as 'editor' returns 'editor'"
  );
  assert(
    resolveEffectiveRole("newuser@gmail.com", undefined) === "viewer",
    "New user defaults to 'viewer'"
  );
  assert(
    resolveEffectiveRole("newuser@gmail.com", "viewer") === "viewer",
    "Stored viewer returns 'viewer'"
  );

  // 3. ALLOWLIST REVOCATION TEST
  console.log("\n3. Dynamic Revocation on Allowlist Removal");
  // Simulate removing admin@mdhealth.com from allowlist
  process.env.ADMIN_EMAILS = "owner@example.com,arsal73500@gmail.com";
  assert(
    resolveEffectiveRole("admin@mdhealth.com", "admin") === "editor",
    "Removed admin email instantly loses Admin privileges and becomes editor"
  );
  assert(!isAdminEmail("admin@mdhealth.com"), "Removed email is no longer on allowlist");

  // 4. RBAC PERMISSIONS MATRIX
  console.log("\n4. Role Permissions Matrix Enforcement");
  // Admin permissions
  assert(hasPermission("admin", "canView"), "Admin canView");
  assert(hasPermission("admin", "canAdd"), "Admin canAdd");
  assert(hasPermission("admin", "canEdit"), "Admin canEdit");
  assert(hasPermission("admin", "canDelete"), "Admin canDelete");
  assert(hasPermission("admin", "canManageTeam"), "Admin canManageTeam");
  assert(hasPermission("admin", "canConfigureGitHub"), "Admin canConfigureGitHub");

  // Editor permissions
  assert(hasPermission("editor", "canView"), "Editor canView");
  assert(hasPermission("editor", "canAdd"), "Editor canAdd");
  assert(hasPermission("editor", "canEdit"), "Editor canEdit");
  assert(!hasPermission("editor", "canDelete"), "Editor CANNOT delete");
  assert(!hasPermission("editor", "canManageTeam"), "Editor CANNOT manage team");
  assert(!hasPermission("editor", "canConfigureGitHub"), "Editor CANNOT configure GitHub");

  // Viewer permissions
  assert(hasPermission("viewer", "canView"), "Viewer canView");
  assert(hasPermission("viewer", "canExport"), "Viewer canExport");
  assert(!hasPermission("viewer", "canAdd"), "Viewer CANNOT add records");
  assert(!hasPermission("viewer", "canEdit"), "Viewer CANNOT edit records");
  assert(!hasPermission("viewer", "canDelete"), "Viewer CANNOT delete records");
  assert(!hasPermission("viewer", "canImport"), "Viewer CANNOT import CSV");
  assert(!hasPermission("viewer", "canManageTeam"), "Viewer CANNOT manage team");

  // 5. USER REGISTRATION & PROMOTION LOGIC
  console.log("\n5. User Sign-in & Promotion Logic");
  const testNewGoogleUser = await recordUserSignIn({
    email: "dr.sarah@gmail.com",
    name: "Dr. Sarah",
  });
  assert(testNewGoogleUser.role === "viewer", "New Google user is automatically assigned Viewer role");

  const testAdminUser = await recordUserSignIn({
    email: "arsal73500@gmail.com",
    name: "Arsal Malik",
  });
  assert(testAdminUser.role === "admin", "Allowlisted Google user is automatically assigned Admin role");

  // Admin promoting user to Editor
  try {
    const promoted = await updateUserRole("dr.sarah@gmail.com", "editor", "arsal73500@gmail.com");
    assert(promoted.role === "editor", "Admin can successfully promote a Viewer to Editor");
  } catch (e: any) {
    assert(false, `Admin promotion failed: ${e.message}`);
  }

  // Non-allowlisted user cannot be promoted to Admin
  try {
    await updateUserRole("dr.sarah@gmail.com", "admin", "arsal73500@gmail.com");
    assert(false, "Should NOT allow promoting non-allowlisted email to Admin");
  } catch (e: any) {
    assert(
      e.message.includes("ADMIN_EMAILS"),
      "Correctly rejects promoting non-allowlisted email to Admin"
    );
  }

  // Admin cannot change own role
  try {
    await updateUserRole("arsal73500@gmail.com", "viewer", "arsal73500@gmail.com");
    assert(false, "Admin should NOT be allowed to change own role");
  } catch (e: any) {
    assert(
      e.message.includes("cannot modify their own role"),
      "Correctly prevents Admin from changing own role"
    );
  }

  // Non-admin cannot promote anyone
  try {
    await updateUserRole("dr.sarah@gmail.com", "editor", "dr.sarah@gmail.com");
    assert(false, "Non-admin should not be able to call updateUserRole");
  } catch (e: any) {
    assert(
      e.message.includes("Only verified Administrators"),
      "Correctly rejects non-admin calling updateUserRole"
    );
  }

  console.log("\n=======================================================");
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test runner encountered error:", e);
  process.exit(1);
});
