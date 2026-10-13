import { beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ read:vi.fn(), removed:vi.fn(), cache:"", write:vi.fn() }));
vi.mock("../server/db", () => ({ db:{select:()=>({from:()=>({orderBy:fixture.read})})} }));
vi.mock("../server/familyModeration", () => ({removedFamilyMembers:fixture.removed}));
vi.mock("node:fs/promises", () => ({mkdir:vi.fn(),writeFile:fixture.write,readFile:async()=>fixture.cache,readdir:async()=>[]}));
import { DatabaseStorage } from "../server/storage";
beforeEach(()=>{vi.clearAllMocks();fixture.removed.mockResolvedValue(new Map());});
describe("compact public wall data",()=>{
 it("includes a known month, excludes private fields and removed names",async()=>{
  fixture.read.mockResolvedValue([{id:"one",title:"Sister",name:"Fixture",email:"private",createdAt:new Date("2025-05-01T00:00:00Z")},{id:"removed",title:"Brother",name:"Hidden",createdAt:new Date()}]);
  fixture.removed.mockResolvedValue(new Map([["removed","removed-date"]]));
  expect(await new DatabaseStorage().getAllMembers()).toEqual([["one","Sister","Fixture","2025-05"]]);
  expect(fixture.write.mock.calls[0][1]).toBe('[["one","Sister","Fixture","2025-05"]]');
 });
 it("preserves names from an older three-field cache without inventing dates",async()=>{
  fixture.read.mockRejectedValue(new Error("fixture database offline"));fixture.cache='[["one","Sister","Fixture"],["two","Cousin","Other","2025-05"]]';
  const quiet=vi.spyOn(console,"error").mockImplementation(()=>{});
  expect(await new DatabaseStorage().getAllMembers()).toEqual([["one","Sister","Fixture",null],["two","Cousin","Other","2025-05"]]);quiet.mockRestore();
 });
});
