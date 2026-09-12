import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './config.ts';
import { DefectItem, ProjectMeta } from '../types.ts';
import { initialDefects, initialProjectMeta } from '../data/initialData.ts';

const DEFECTS_COLLECTION = 'defects';
const CONFIG_COLLECTION = 'config';
const PROJECT_DOC_ID = 'projectMeta';

let hasAttemptedSeed = false;

/**
 * Seeds initial defect records into Firestore if the collection is empty.
 */
export async function seedInitialDataIfEmpty(): Promise<boolean> {
  if (hasAttemptedSeed) return false;
  hasAttemptedSeed = true;

  try {
    const snapshot = await getDocs(collection(db, DEFECTS_COLLECTION));
    if (snapshot.empty) {
      console.info('Seeding initial QA defects into Firebase Firestore...');
      const batch = writeBatch(db);

      // Add default project metadata
      const projRef = doc(db, CONFIG_COLLECTION, PROJECT_DOC_ID);
      batch.set(projRef, initialProjectMeta);

      // Add default defect records
      for (const item of initialDefects) {
        const dRef = doc(db, DEFECTS_COLLECTION, item.id);
        batch.set(dRef, item);
      }

      await batch.commit();
      console.info('Successfully seeded initial QA data to Firestore');
      return true;
    }
  } catch (err) {
    console.error('Error seeding initial Firestore data:', err);
  }
  return false;
}

/**
 * Real-time subscription to the Firestore defects collection.
 */
export function subscribeToDefects(
  onData: (defects: DefectItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  const defectsRef = collection(db, DEFECTS_COLLECTION);

  const unsubscribe = onSnapshot(
    defectsRef,
    async (snapshot) => {
      if (snapshot.empty && !hasAttemptedSeed) {
        await seedInitialDataIfEmpty();
        return;
      }

      const items: DefectItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as DefectItem;
        items.push({
          ...data,
          id: d.id
        });
      });

      // Sort defects stably: recently created / updated first
      items.sort((a, b) => {
        const dateA = a.createdDate || '';
        const dateB = b.createdDate || '';
        if (dateB !== dateA) {
          return dateB.localeCompare(dateA);
        }
        return b.bugId.localeCompare(a.bugId);
      });

      onData(items);
    },
    (err) => {
      console.warn('Firestore defects subscription error:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Real-time subscription to project metadata in Firestore.
 */
export function subscribeToProjectMeta(
  onData: (meta: ProjectMeta) => void,
  onError?: (error: Error) => void
): () => void {
  const metaDocRef = doc(db, CONFIG_COLLECTION, PROJECT_DOC_ID);

  const unsubscribe = onSnapshot(
    metaDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ProjectMeta;
        if (data.version !== '4.2.1' || data.revision !== '1410') {
          const updated = { ...data, version: '4.2.1', revision: '1410' };
          setDoc(metaDocRef, updated, { merge: true }).catch(console.warn);
          onData(updated);
        } else {
          onData(data);
        }
      } else {
        // If not found, write default
        setDoc(metaDocRef, initialProjectMeta).catch((err) =>
          console.warn('Failed to initialize default project meta:', err)
        );
        onData(initialProjectMeta);
      }
    },
    (err) => {
      console.warn('Firestore projectMeta subscription error:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Add or overwrite a defect in Firestore.
 */
export async function addDefectToFirestore(defect: DefectItem): Promise<void> {
  const docRef = doc(db, DEFECTS_COLLECTION, defect.id);
  await setDoc(docRef, defect);
}

/**
 * Update specific fields of a defect in Firestore.
 */
export async function updateDefectInFirestore(
  id: string,
  updates: Partial<DefectItem>
): Promise<void> {
  const docRef = doc(db, DEFECTS_COLLECTION, id);
  await updateDoc(docRef, {
    ...updates,
    updatedDate: new Date().toISOString().split('T')[0]
  });
}

/**
 * Delete a defect from Firestore.
 */
export async function deleteDefectFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, DEFECTS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Bulk delete defects from Firestore using batch write.
 */
export async function bulkDeleteDefectsFromFirestore(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  for (const id of ids) {
    const docRef = doc(db, DEFECTS_COLLECTION, id);
    batch.delete(docRef);
  }
  await batch.commit();
}

/**
 * Bulk import or upsert defects in Firestore.
 */
export async function bulkUpsertDefectsToFirestore(defects: DefectItem[]): Promise<void> {
  if (defects.length === 0) return;
  const batch = writeBatch(db);
  for (const item of defects) {
    const docRef = doc(db, DEFECTS_COLLECTION, item.id);
    batch.set(docRef, item, { merge: true });
  }
  await batch.commit();
}

/**
 * Update project metadata in Firestore.
 */
export async function updateProjectMetaInFirestore(
  updates: Partial<ProjectMeta>
): Promise<void> {
  const docRef = doc(db, CONFIG_COLLECTION, PROJECT_DOC_ID);
  await setDoc(docRef, updates, { merge: true });
}

/**
 * Reset Firestore collection to the default QA execution report template.
 */
export async function resetFirestoreToTemplate(): Promise<void> {
  const snapshot = await getDocs(collection(db, DEFECTS_COLLECTION));
  const batch = writeBatch(db);

  // Delete all current records
  snapshot.forEach((d) => {
    batch.delete(d.ref);
  });

  // Re-seed default defects
  for (const item of initialDefects) {
    const dRef = doc(db, DEFECTS_COLLECTION, item.id);
    batch.set(dRef, item);
  }

  // Re-seed default project meta
  const projRef = doc(db, CONFIG_COLLECTION, PROJECT_DOC_ID);
  batch.set(projRef, initialProjectMeta);

  await batch.commit();
}
