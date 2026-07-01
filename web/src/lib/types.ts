export type Role = "STUDENT" | "PARENT";

export interface SessionUserDTO {
  id: string;
  name: string;
  role: Role;
  schoolLabel: string;
  phone: string;
}
