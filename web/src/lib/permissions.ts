import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

/* Who may do what in the admin. Four roles:
     customer  the default for every account: no admin at all
     staff     at one location: the orders board, the sold-out switch, looking up customers, bookings
     manager   runs one location: everything staff do, plus its prices, its reports, its hours and
               phone, and who works there as staff
     admin     every location: the shared menu (names, photos, sections), new locations, roles and
               blocks, the brand's settings
   Which location a staff member or manager works at is user.locationId; src/lib/scope.ts keeps
   them to it.
   Better Auth's own user-management actions (set role, block) are admin only, and nobody can
   impersonate anybody. Used on the server for every check, and in the browser only to hide
   what someone can't use. */
export const statements = {
  ...defaultStatements,
  order: ["view", "update"],
  /* toggle: sold out; price: prices at a location; edit: the shared menu itself */
  menu: ["toggle", "price", "edit"],
  customer: ["view"],
  report: ["view"],
  booking: ["view", "update"],
  settings: ["edit"],
  /* edit: a location's hours, phone and online ordering; create: add or change any location */
  location: ["edit", "create"],
  /* add or remove staff at your own location */
  team: ["assign"],
} as const;

export const ac = createAccessControl(statements);

export const roles = {
  customer: ac.newRole({}),
  staff: ac.newRole({
    order: ["view", "update"],
    menu: ["toggle"],
    customer: ["view"],
    booking: ["view", "update"],
  }),
  manager: ac.newRole({
    order: ["view", "update"],
    menu: ["toggle", "price"],
    customer: ["view"],
    report: ["view"],
    booking: ["view", "update"],
    location: ["edit"],
    team: ["assign"],
  }),
  admin: ac.newRole({
    user: ["list", "get", "set-role", "ban", "update"],
    session: ["list", "revoke"],
    order: ["view", "update"],
    menu: ["toggle", "price", "edit"],
    customer: ["view"],
    report: ["view"],
    booking: ["view", "update"],
    settings: ["edit"],
    location: ["edit", "create"],
    team: ["assign"],
  }),
};

export type Role = keyof typeof roles;
export const ROLES = Object.keys(roles) as Role[];
export const ROLE_NAMES: Record<Role, string> = { customer: "Customer", staff: "Staff", manager: "Manager", admin: "Admin" };

/** Roles that work at one location (user.locationId). */
export function atOneLocation(role: string | null | undefined) {
  return role === "staff" || role === "manager";
}

type Perm = { [K in keyof typeof statements]?: (typeof statements)[K][number][] };

export function can(role: string | null | undefined, perm: Perm): boolean {
  const r = roles[(role ?? "customer") as Role];
  if (!r) return false;
  return r.authorize(perm as never).success;
}

export function isRole(x: string): x is Role {
  return x in roles;
}
