/* Локальное хранилище и начисления по Самаре (UTC+04:00). Денежные значения — копейки. */
(function(){
 'use strict';
 const KEY='weekly-budget-v1'; // Совместимость с уже сохранёнными данными версии 1.
 const WEEK=7*86400000, SAMARA=4*3600000;
 const MAX_AMOUNT=100000000000; // 1 млрд рублей (в копейках) для отдельной операции.
 const MAX_BALANCE=1000000000000; // 10 млрд рублей (в копейках) для остатка.
 const MIN_TIME=946684800000, MAX_TIME=4102444800000; // 2000–2100.
 const startingBoundary=now=>{const d=new Date(now+SAMARA);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-d.getUTCDay())-SAMARA;};
 const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 function init(now=Date.now()){return {version:1,budget:1850000,balance:1850000,auto:true,lastBoundary:startingBoundary(now),expenses:[],adjustments:[]};}
 function normalize(src){
  if(!src||typeof src!=='object'||Array.isArray(src))throw Error('Неправильный формат данных');
  if(!integer(src.budget,1,MAX_AMOUNT)||!integer(src.balance,-MAX_BALANCE,MAX_BALANCE)||typeof src.auto!=='boolean'||!integer(src.lastBoundary,MIN_TIME,MAX_TIME)||startingBoundary(src.lastBoundary)!==src.lastBoundary||!Array.isArray(src.expenses)||src.expenses.length>100000)throw Error('Некорректные поля бюджета');
  const ids=new Set();
  const expenses=src.expenses.map(e=>{
   if(!e||typeof e.id!=='string'||!e.id||e.id.length>100||ids.has(e.id)||!integer(e.amount,1,MAX_AMOUNT)||!integer(e.at,MIN_TIME,MAX_TIME))throw Error('Повреждённые расходы');
   ids.add(e.id);return {id:e.id,amount:e.amount,at:e.at};
  });
  const adjustments=(src.adjustments===undefined?[]:src.adjustments);
  if(!Array.isArray(adjustments)||adjustments.length>100000)throw Error('Повреждён журнал корректировок');
  const normalizedAdjustments=adjustments.map(a=>{
   if(!a||!integer(a.at,MIN_TIME,MAX_TIME)||!integer(a.from,-MAX_BALANCE,MAX_BALANCE)||!integer(a.to,-MAX_BALANCE,MAX_BALANCE))throw Error('Повреждена корректировка остатка');
   return {at:a.at,from:a.from,to:a.to};
  });
  return {version:1,budget:src.budget,balance:src.balance,auto:src.auto,lastBoundary:src.lastBoundary,expenses,adjustments:normalizedAdjustments};
 }
 function load(){
  let raw;
  try{raw=localStorage.getItem(KEY);}catch(e){throw new Error('Нет доступа к памяти браузера. '+e.message);}
  if(raw===null)return init();
  try{return normalize(JSON.parse(raw));}catch(e){throw new Error('Сохранённые данные не удалось прочитать. Они не были перезаписаны. '+e.message);}
 }
 function save(state){
  try{const valid=normalize(state);localStorage.setItem(KEY,JSON.stringify(valid));return valid;}
  catch(e){throw new Error('Не удалось сохранить данные: '+e.message);}
 }
 function accrue(state,now=Date.now()){
  const boundary=startingBoundary(now);
  if(!state.auto){state.lastBoundary=boundary;return 0;}
  if(state.lastBoundary>boundary)return 0; // Не начислять повторно при переводе часов назад.
  const count=Math.floor((boundary-state.lastBoundary)/WEEK);
  if(count<=0)return 0;
  const next=state.balance+count*state.budget;
  if(!integer(next,-MAX_BALANCE,MAX_BALANCE))throw Error('Баланс превышает допустимый предел');
  state.balance=next;state.lastBoundary=boundary;return count;
 }
 window.BudgetStore={KEY,WEEK,SAMARA,MAX_AMOUNT,MAX_BALANCE,load,save,init,normalize,accrue,startingBoundary};
})();
