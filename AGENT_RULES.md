RULES FOR MODIFYING CODE

1. Never modify existing working logic unless explicitly requested.
2. Never rename variables, functions, or imports unless required.
3. Never delete existing code.
4. Only edit the exact section requested.
5. When adding new code, verify all required imports exist.
6. If adding Router(), Controller, Middleware, Prisma, or Service references,
   automatically check and add missing imports.
7. Do not refactor entire files.
8. Do not change API routes unless instructed.
9. Do not change database schema unless instructed.
10. Prefer additive changes instead of modifying existing structures.

Before completing any modification:
- Verify imports
- Verify TypeScript types
- Verify build compiles