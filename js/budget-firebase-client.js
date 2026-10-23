import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {getFirestore,doc,getDoc,getDocFromServer,collection,getDocs,onSnapshot} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js';
import {firebaseConfig} from './firebase-config.js';
const app=initializeApp(firebaseConfig,'school-budget'),auth=getAuth(app),db=getFirestore(app),call=httpsCallable(getFunctions(app,'asia-southeast1'),'budgetApi',{timeout:60000});
const guest={id:'guest',role:'guest',name:'Guest',canWriteBudget:false};
export const ready=new Promise((resolve,reject)=>{const off=onAuthStateChanged(auth,user=>{off();resolve(user)},reject)});
export async function profile(){await ready;const user=auth.currentUser;if(!user)return guest;try{const snap=await getDocFromServer(doc(db,'budget_users',user.uid));const p=snap.data();if(!p||!p.active)throw Error('บัญชีนี้ยังไม่ได้รับสิทธิ์ระบบงบประมาณ');return {...p,id:user.uid}}catch(error){if(error.code==='permission-denied')throw Error('บัญชีนี้ยังไม่ได้รับสิทธิ์ระบบงบประมาณ กรุณาติดต่อผู้ดูแล');throw error}}
export async function login(){const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return signInWithPopup(auth,provider)}
export const logout=()=>signOut(auth);
export async function rpc(method,...args){try{return (await call({method,args})).data}catch(e){throw Error(String(e.message||'ดำเนินการไม่สำเร็จ').replace(/^Firebase:\s*/,''))}}
export async function readYear(year,force=false){const ref=doc(db,'budget_public_years',String(year)),snap=await(force?getDocFromServer(ref):getDoc(ref));if(!snap.exists())return {year,status:'empty',projects:[],departments:[]};return JSON.parse(snap.data().json)}
export function watchYear(year,receive,error){return onSnapshot(doc(db,'budget_public_years',String(year)),{includeMetadataChanges:true},snap=>{if(snap.exists())receive(JSON.parse(snap.data().json),snap.metadata.fromCache)},error)}
export async function years(){return (await getDocs(collection(db,'budget_public_years'))).docs.map(d=>Number(d.id)).sort((a,b)=>b-a)}
