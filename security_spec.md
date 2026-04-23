# Security Spec: Ponto

## Data Invariants
1. A configuration row in `userSettings` strictly validates setting constraints and the `userId` in the payload must match the caller.
2. A `Punch` item cannot exist without a valid `timestamp` matching `request.time`.
3. Users can only read/write their own data in `users/{userId}`, `userSettings/{userId}`, and `/users/{userId}/punches/*`.
4. Users cannot modify `createdAt` in `users/{userId}`.

## The "Dirty Dozen" Payloads
1. **Self-Escalation**: Attempting to set `isAdmin: true` in `users` obj. (Must fail constraints check)
2. **Missing Email**: `users` create with no `email`. (Must fail schema check)
3. **Invalid Email Type**: `email` is an array. (Must fail enum/type check)
4. **Invalid Punch Date**: Setting `Punch` timestamp to a past date instead of `request.time`. (Must fail temporal check)
5. **Ghost Field**: `Punch` create with an extra `location: "Mars"` field. (Must fail strict schema / diff checks)
6. **Cross-User Modify**: User A tries to create a punch in `users/UserB/punches/punchId`. (Must fail Auth/Identity check)
7. **Type Poisoning**: `expectedMinutes` set to string `"528"`. (Must fail schema type check)
8. **Size Poisoning**: `type` in `Punch` is greater than allowed string limits or not in enum `["in", "out"]`.
9. **Update Immutable**: Updating `users/{uid}` and changing `createdAt`. (Must fail immortal rule)
10. **Unverified Email**: A user with `email_verified == false` tries to create their profile. (Must fail verification rule)
11. **Malicious ID injection**: Path variable `userId` contains `/` or `.` (Blocked by isValidId).
12. **Unauthenticated Read**: Attempt to read list of punches unauthenticated. (Must fail auth check)
