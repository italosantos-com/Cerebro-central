import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

type StepResult = { name: string; code: number | null; signal: NodeJS.Signals | null };

function logHeader(title: string) {
    process.stdout.write(`\n=== ${title} ===\n`);
}

function logKV(key: string, value: unknown) {
    process.stdout.write(`${key}: ${String(value)}\n`);
}

function runStep(
    name: string,
    command: string,
    args: string[],
    opts?: {
        env?: NodeJS.ProcessEnv;
        cwd?: string;
    },
): Promise<StepResult> {
    return new Promise((resolve) => {
        logHeader(name);
        process.stdout.write(`$ ${command} ${args.join(' ')}\n\n`);

        const child = spawn(command, args, {
            stdio: 'pipe',
            shell: false,
            cwd: opts?.cwd ?? process.cwd(),
            env: { ...process.env, ...(opts?.env ?? {}) },
        });

        const prefixLine = (chunk: Buffer, prefix: string, isErr: boolean) => {
            const text = chunk.toString('utf8');
            const lines = text.split(/\r?\n/);
            for (let index = 0; index < lines.length; index++) {
                const line = lines[index];
                if (!line) continue;
                (isErr ? process.stderr : process.stdout).write(`${prefix}${line}\n`);
            }
        };

        child.stdout.on('data', (chunk) => prefixLine(chunk, `[${name}] `, false));
        child.stderr.on('data', (chunk) => prefixLine(chunk, `[${name}] `, true));

        child.on('close', (code, signal) => {
            process.stdout.write(`\n[${name}] exit: code=${code} signal=${signal ?? 'null'}\n`);
            resolve({ name, code, signal });
        });
    });
}

async function main() {
    const startedAt = Date.now();

    logHeader('Env');
    logKV('node', process.version);
    logKV('platform', `${process.platform} ${process.arch}`);
    logKV('cwd', process.cwd());
    logKV('CHECK_DEBUG', process.env.CHECK_DEBUG ?? '');
    logKV(
        'memory(MB)',
        JSON.stringify({
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        }),
    );

    const repoRoot = process.cwd();
    const tsconfigSrcPath = path.join(repoRoot, 'tsconfig.src.json');
    if (!existsSync(tsconfigSrcPath)) {
        process.stderr.write(`Missing tsconfig.src.json at ${tsconfigSrcPath}\n`);
        process.exitCode = 2;
        return;
    }

    const debug = process.env.CHECK_DEBUG === '1' || process.env.CHECK_DEBUG === 'true';

    const results: StepResult[] = [];

    // TypeScript (src only)
    results.push(
        await runStep(
            'tsc:src',
            process.platform === 'win32' ? 'npx.cmd' : 'npx',
            [
                'tsc',
                '-p',
                'tsconfig.src.json',
                '--noEmit',
                '--pretty',
                'false',
                '--noErrorTruncation',
            ],
            {
                env: {
                    // Helps reduce noisy node warnings in CI/dev
                    NODE_NO_WARNINGS: '1',
                    NODE_ENV: 'development'
                },
            },
        ),
    );

    const eslintNodeOptions = process.env.NODE_OPTIONS ?? '--max-old-space-size=8192';
    const srcDir = path.join(repoRoot, 'src');
    const srcEntries = readdirSync(srcDir)
        .map((entry) => path.join('src', entry))
        .filter((entry) => {
            const fullPath = path.join(repoRoot, entry);
            try {
                return statSync(fullPath).isDirectory() || /\.tsx?$/.test(entry);
            } catch {
                return false;
            }
        });

    logHeader('ESLint chunks');
    logKV('count', srcEntries.length);
    if (debug) {
        logKV('entries', srcEntries.join(', '));
    }

    for (const entry of srcEntries) {
        results.push(
            await runStep(
                `eslint:src:${entry}`,
                process.platform === 'win32' ? 'npx.cmd' : 'npx',
                [
                    'eslint',
                    entry,
                    '--ext',
                    '.ts,.tsx',
                    '--max-warnings',
                    '0',
                    '--cache',
                    '--cache-location',
                    '.eslintcache',
                    ...(debug ? ['--debug'] : []),
                ],
                {
                    env: {
                        NODE_OPTIONS: eslintNodeOptions,
                        // Eslint debug can be very verbose; leave it opt-in.
                        ...(debug ? { DEBUG: 'eslint:*' } : {}),
                        NODE_ENV: 'development'
                    },
                },
            ),
        );
    }

    logHeader('Summary');
    for (const result of results) {
        logKV(result.name, `code=${result.code} signal=${result.signal ?? 'null'}`);
    }

    const failed = results.some((result) => result.code !== 0);
    const durationMs = Date.now() - startedAt;
    logKV('duration', `${Math.round(durationMs / 1000)}s`);

    if (failed) {
        process.stderr.write('\nOne or more checks failed.\n');
        process.stderr.write('Tip: run with CHECK_DEBUG=1 for deeper ESLint diagnostics.\n');
        process.stderr.write('Tip: if you hit OOM, try NODE_OPTIONS=--max-old-space-size=8192.\n');
        process.exitCode = 1;
    }
}

main().catch((err) => {
    process.stderr.write(String(err?.stack ?? err) + '\n');
    process.exitCode = 1;
});
