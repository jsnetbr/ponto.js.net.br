import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ID = 'demo-ponto-project';

let testEnv: RulesTestEnvironment;

const authedDb = (uid: string, emailVerified = true) =>
  testEnv.authenticatedContext(uid, { email_verified: emailVerified }).firestore();

const seedUserProfile = async (uid: string) => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'users', uid), {
      email: `${uid}@test.com`,
      createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
    });
  });
};

const seedUserSettings = async (uid: string, expectedMinutes = 528) => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, 'userSettings', uid), {
      userId: uid,
      expectedMinutes,
      requireLocation: true,
      updatedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
    });
  });
};

const seedPunch = async (uid: string, punchId: string, type: 'in' | 'out' = 'in') => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(doc(adminDb, `users/${uid}/punches/${punchId}`), {
      userId: uid,
      timestamp: Timestamp.fromDate(new Date('2026-01-01T08:00:00.000Z')),
      type,
    });
  });
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(__dirname, 'firestore.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe('Firestore security rules', () => {
  it('blocks unauthenticated reads', async () => {
    await seedPunch('user1', 'p1');
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users/user1/punches/p1')));
    await assertFails(getDocs(collection(db, 'users/user1/punches')));
  });

  it('requires verified e-mail', async () => {
    const db = authedDb('user1', false);
    await assertFails(
      setDoc(doc(db, 'users', 'user1'), {
        email: 'user1@test.com',
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('allows valid user profile creation and blocks extra fields', async () => {
    const db = authedDb('user1');
    await assertSucceeds(
      setDoc(doc(db, 'users', 'user1'), {
        email: 'user1@test.com',
        createdAt: serverTimestamp(),
      }),
    );

    await assertFails(
      setDoc(doc(db, 'users', 'user2'), {
        email: 'user2@test.com',
        createdAt: serverTimestamp(),
        isAdmin: true,
      }),
    );
  });

  it('blocks cross-user write in punches', async () => {
    const db = authedDb('user1');
    await assertFails(
      addDoc(collection(db, 'users/user2/punches'), {
        userId: 'user2',
        timestamp: serverTimestamp(),
        type: 'in',
      }),
    );
  });

  it('allows valid punch create and blocks invalid payload', async () => {
    const db = authedDb('user1');

    await assertSucceeds(
      addDoc(collection(db, 'users/user1/punches'), {
        userId: 'user1',
        timestamp: serverTimestamp(),
        type: 'in',
      }),
    );

    await assertFails(
      addDoc(collection(db, 'users/user1/punches'), {
        userId: 'user1',
        timestamp: serverTimestamp(),
        type: 'invalid',
      }),
    );

    await assertFails(
      addDoc(collection(db, 'users/user1/punches'), {
        userId: 'user1',
        timestamp: serverTimestamp(),
        type: 'out',
        location: 'office',
      }),
    );
  });

  it('allows editing timestamp only and allows delete for owner', async () => {
    await seedPunch('user1', 'p1', 'in');
    const db = authedDb('user1');

    await assertSucceeds(
      updateDoc(doc(db, 'users/user1/punches/p1'), {
        timestamp: new Date('2026-01-01T09:00:00.000Z'),
      }),
    );

    await assertFails(
      updateDoc(doc(db, 'users/user1/punches/p1'), {
        type: 'out',
      }),
    );

    await assertSucceeds(deleteDoc(doc(db, 'users/user1/punches/p1')));
  });

  it('blocks cross-user delete in punches', async () => {
    await seedPunch('user1', 'p1', 'in');
    const db = authedDb('user2');
    await assertFails(deleteDoc(doc(db, 'users/user1/punches/p1')));
  });

  it('allows valid userSettings create/update and blocks invalid types', async () => {
    const db = authedDb('user1');

    await assertSucceeds(
      setDoc(doc(db, 'userSettings', 'user1'), {
        userId: 'user1',
        expectedMinutes: 480,
        requireLocation: true,
        updatedAt: serverTimestamp(),
      }),
    );

    await assertSucceeds(
      updateDoc(doc(db, 'userSettings/user1'), {
        expectedMinutes: 510,
        updatedAt: serverTimestamp(),
      }),
    );

    await assertFails(
      updateDoc(doc(db, 'userSettings/user1'), {
        expectedMinutes: '510',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('blocks cross-user access in userSettings', async () => {
    await seedUserSettings('user1');
    const db = authedDb('user2');
    await assertFails(getDoc(doc(db, 'userSettings/user1')));
    await assertFails(
      updateDoc(doc(db, 'userSettings/user1'), {
        expectedMinutes: 500,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('blocks profile updates after creation', async () => {
    await seedUserProfile('user1');
    const db = authedDb('user1');
    await assertFails(
      updateDoc(doc(db, 'users/user1'), {
        email: 'new-email@test.com',
      }),
    );
  });
});
