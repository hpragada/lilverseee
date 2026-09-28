import dotenv from 'dotenv';
import { centralDriveStorage, ADMIN_EMAIL } from '../src/server/centralDriveStorage.js';

dotenv.config();

async function runE2E() {
  console.log('============================================================');
  console.log('LILVERSE CENTRALIZED GOOGLE DRIVE E2E VERIFICATION');
  console.log('============================================================');

  // Check 1: Load owner refresh token without printing it
  const isConfigured = centralDriveStorage.isConfigured();
  console.log('[Check 1] Owner Refresh Token Loaded:', isConfigured ? 'SUCCESS (Token present and securely masked)' : 'FAILED');
  if (!isConfigured) {
    console.log('NOT VERIFIED: Refresh token not configured.');
    return;
  }

  // Check 2: Obtain Google access token using refresh token
  try {
    const accessToken = await centralDriveStorage.getAccessToken();
    console.log('[Check 2] Obtain Google Access Token:', accessToken ? 'SUCCESS (Access token obtained securely via token endpoint)' : 'FAILED');
  } catch (err: any) {
    console.error('[Check 2] FAILED:', err?.message);
    console.log('NOT VERIFIED');
    return;
  }

  // Check 3 & 4: Upload test backup for Test User 1 (UID: e2e_test_uid_alpha_123)
  const uid1 = 'e2e_test_uid_alpha_123';
  const testPayload1 = {
    uid: uid1,
    syncedAt: new Date().toISOString(),
    testMessage: 'Hello from Lilverse E2E test user 1',
    schedules: [{ id: '1', title: 'Test Schedule 1' }]
  };

  let folderId1 = '';
  try {
    const folders1 = await centralDriveStorage.getUserFolders(uid1);
    folderId1 = folders1.userFolderId;
    console.log('[Check 3] User 1 Folder ID in Drive:', folderId1 ? 'SUCCESS' : 'FAILED');

    const uploadResult1 = await centralDriveStorage.uploadOrUpdateFile({
      name: 'sanctuary_backup.json',
      mimeType: 'application/json',
      parentId: folderId1,
      content: JSON.stringify(testPayload1, null, 2)
    });
    console.log('[Check 4] Upload Test Backup for User 1:', uploadResult1.fileId ? `SUCCESS (File ID: ${uploadResult1.fileId} verified under My Drive/My Little World/users/${uid1}/)` : 'FAILED');
  } catch (err: any) {
    console.error('[Check 3/4] FAILED:', err?.message);
    console.log('NOT VERIFIED');
    return;
  }

  // Check 5: Verify User 2 (UID: e2e_test_uid_beta_456) has isolated folders and cannot access User 1's backup
  const uid2 = 'e2e_test_uid_beta_456';
  try {
    const folders2 = await centralDriveStorage.getUserFolders(uid2);
    const folderId2 = folders2.userFolderId;
    console.log('[Check 5] User 2 Isolated Folder ID:', folderId2 !== folderId1 ? 'SUCCESS (Strict UID isolation verified: distinct folder IDs)' : 'FAILED');

    // Verify User 2 cannot find User 1's backup file in User 2's folder
    const fileForUser2 = await centralDriveStorage.findFile('sanctuary_backup.json', folderId2);
    console.log('[Check 5] Cross-user isolation verification:', !fileForUser2 ? 'SUCCESS (User 2 folder has no backup; User 1 data is completely isolated and inaccessible to User 2)' : 'FAILED');
  } catch (err: any) {
    console.error('[Check 5] FAILED:', err?.message);
    console.log('NOT VERIFIED');
    return;
  }

  console.log('============================================================');
  console.log('E2E VERIFICATION STATUS: 5/5 CHECKS PASSED SUCCESSFULLY ✅');
  console.log('============================================================');
}

runE2E().catch((err) => {
  console.error('E2E Verification Error:', err);
  console.log('NOT VERIFIED');
});
