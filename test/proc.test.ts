import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";

describe("run", () => {
  test.skipIf(process.platform !== "win32")("runs a command installed as a Windows cmd shim under Node", async () => {
    const root = await mkdtemp(join(tmpdir(), "semantic-review-proc-"));
    const target = join(root, "versioned installation");
    const active = join(root, "active");
    try {
      await mkdir(target);
      await symlink(target, active, "junction");
      await writeFile(join(target, "semantic-review-test-command"), "#!/bin/sh\necho wrong launcher\n");
      await writeFile(join(target, "semantic-review-test-command.cmd"), "@echo off\r\necho ok\r\n");
      const script = [
        `import { run } from ${JSON.stringify(new URL("../src/proc.ts", import.meta.url).href)};`,
        `const result = await run(["semantic-review-test-command"]);`,
        `process.stdout.write(result.stdout);`,
      ].join("\n");
      const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
        encoding: "utf8",
        env: { ...process.env, PATH: `${active}${delimiter}${process.env.PATH ?? ""}` },
      });

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout.trim()).toBe("ok");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
