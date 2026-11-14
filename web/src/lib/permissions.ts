import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

/* Who may do what in the admin. Three roles:
     customer  the default for every account: no admin at all
     staff     the orders board, the sold-out switch, looking up customers
     admin     everything: prices and items, roles and blocks, reports
   Better Auth's own user-management actions (set role, block) are admin only, and nobody can
   impersonate anybody. Used on the server for every check, and in the browser only to hide
   what someone can't use. */
export const statements = {
  ...defaultStatements,
  order: ["view", "update"],
  menu: ["toggle", "edit"],
  customer: ["view"],
  report: ["view"],
} as const;

export const ac = createAccessControl(statements);

export const roles = {
  customer: ac.newRole({}),
  staff: ac.newRole({
    order: ["view", "update"],
    menu: ["toggle"],
    customer: ["view"],
  }),
  admin: ac.newRole({
    user: ["list", "get", "set-role", "ban", "update"],
    session: ["list", "revoke"],
    order: ["view", "update"],
    menu: ["toggle", "edit"],
    customer: ["view"],
    report: ["view"],
  }),
};

export type Role = keyof typeof roles;
export const ROLES = Object.keys(roles) as Role[];
export const ROLE_NAMES: Record<Role, string> = { customer: "Customer", staff: "Staff", admin: "Admin" };

type Perm = { [K in keyof typeof statements]?: (typeof statements)[K][number][] };

export function can(role: string | null | undefined, perm: Perm): boolean {
  const r = roles[(role ?? "customer") as Role];
  if (!r) return false;
  return r.authorize(perm as never).success;
}

export function isRole(x: string): x is Role {
  return x in roles;
}
