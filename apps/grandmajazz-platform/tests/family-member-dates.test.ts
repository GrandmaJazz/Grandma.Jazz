import { describe, expect, it } from "vitest";
import { joinedMonthLabel, publicWallMember, recordedJoinMonth } from "../shared/family-original/memberDates";

describe("public Family joining dates", () => {
  it("preserves known months and formats them without timezone shifts", () => {
    expect(recordedJoinMonth("2025-05-01T00:00:00Z")).toBe("2025-05");
    expect(joinedMonthLabel("2025-05")).toBe("May 2025");
    expect(joinedMonthLabel("2024-11")).toBe("November 2024");
  });
  it("does not represent a legacy import timestamp as an actual joining date", () => {
    expect(recordedJoinMonth("2025-03-28T13:15:30Z")).toBeNull();
    expect(recordedJoinMonth("2025-03-27T13:15:30Z")).toBe("2025-03");
    for (const value of [null, undefined, "", "invalid"]) expect(recordedJoinMonth(value)).toBeNull();
    for (const value of [null, undefined, "", "invalid", "2025-13"]) expect(joinedMonthLabel(value)).toBe("Before records began");
  });
  it("returns only the public name fields and month, never email or private flags", () => {
    const record = { id:"fixture", title:"Cousin", name:"Fixture", email:"private@example.invalid", welcomeEmailSent:true, createdAt:"2025-05-02T17:00:00Z" };
    expect(publicWallMember(record)).toEqual(["fixture", "Cousin", "Fixture", "2025-05"]);
    expect(publicWallMember({...record, createdAt:"2025-03-28T17:00:00Z"})).toEqual(["fixture", "Cousin", "Fixture", null]);
  });
});
