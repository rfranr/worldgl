### Navigation semantics

- Movement commands are asynchronous. A successful tool response means the movement was accepted, not that the destination was reached.
- Only one movement command can be active at a time.
- Issuing another movement command immediately interrupts the previous one.
- Use `navigation_status` to determine whether a movement is still active, completed, blocked, or interrupted.
- Before issuing a new movement command, check the status of the previous movement, unless you intentionally want to abort it.
- Call `inspect_world` and read its result before planning your initial route.
- Do not claim to have reached a destination unless the observed position confirms it.