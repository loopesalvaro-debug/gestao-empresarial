import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp, query, orderBy
} from 'firebase/firestore'
import { db } from './firebase'

// Escuta em tempo real uma coleção e chama callback com o array atualizado
export function subscribeCollection(colName, callback, order = 'createdAt') {
  const q = query(collection(db, colName), orderBy(order, 'asc'))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function addDocument(colName, data) {
  return addDoc(collection(db, colName), { ...data, createdAt: serverTimestamp() })
}

export async function updateDocument(colName, id, data) {
  return updateDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteDocument(colName, id) {
  return deleteDoc(doc(db, colName, id))
}
