import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {createStore} from "../guides/core/storage.js";

describe("Rome local profile storage",()=>{
  const values=new Map<string,string>();
  beforeEach(()=>{
    values.clear();
    Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:(key:string)=>values.get(key) ?? null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}});
  });
  afterEach(()=>{ delete (globalThis as {localStorage?:unknown}).localStorage; });
  it("saves and reads a trip profile",()=>{
    createStore("rome-test",{tripProfile:{configured:false}}).set({tripProfile:{configured:true,arrivalDate:"2026-10-07"}});
    expect(createStore("rome-test",{tripProfile:{configured:false}}).get().tripProfile.configured).toBe(true);
  });
  it("resets the profile and survives corrupted JSON",()=>{
    const store=createStore("rome-test",{tripProfile:{configured:false}}); store.set({tripProfile:{configured:true}}); store.reset();
    expect(store.get().tripProfile.configured).toBe(false);
    values.set("mp:rome-test:state:v1","{");
    expect(createStore("rome-test",{tripProfile:{configured:false}}).get().tripProfile.configured).toBe(false);
  });
});
