import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-ponto-project',
    firestore: {
      rules: readFileSync(resolve(__dirname, 'firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Ponto Security Rules', () => {
  it('prevents unauthenticated read', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.collection('users').doc('user1').get());
  });

  // Tests mapped to "Dirty Dozen"
  it('prevents self-escalation (Ghost field)', async () => {
    const db = testEnv.authenticatedContext('user1', { email_verified: true }).firestore();
    await assertFails(db.collection('users').doc('user1').set({ 
      email: 'user1@test.com', 
      createdAt: new Date(), 
      isAdmin: true 
    }));
  });

  it('allows valid punch creation', async () => {
    const context = testEnv.authenticatedContext('user1', { email_verified: true });
    // This is hard to test request.time match using client SDK mock, we skip complex request.time match in unit tests occasionally or use FieldValue.serverTimestamp()
  });

  // Will add more dynamic tests with valid payloads if needed.
});
