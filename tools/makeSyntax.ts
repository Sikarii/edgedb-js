#!/usr/bin/env node

// tslint:disable:no-console

import _fs from "fs";
import path from "path";
import {globby} from "globby";

const args = process.argv;
const denoOnly = args[2] === "--deno";
const nodeOnly = args[2] === "--node";

const fs = _fs.promises;

const DEBUG = false;

const srcSyntax = path.join(__dirname, "..", "src", "syntax");
const distSyntax = path.join(__dirname, "..", "dist", "syntax");
const esmSyntax = path.join(__dirname, "..", "dist", "__esm", "syntax");

const reReflection = /"\.\.\/reflection([a-zA-Z0-9\_\/]*)\.?(.*)"/g;
const reGenerated = /"@generated\/(.*)"/g;
const reRelativeImports = /"(\.?\.\/.+)"/g;

async function readGlob(params: {
  pattern: string;
  cwd: string;
  contentTx?: (orig: string) => string;
  pathTx?: (orig: string) => string;
}) {
  const {pattern, cwd, pathTx, contentTx} = params;
  const matches = await globby(pattern, {cwd});
  return await Promise.all(
    matches.map(async match => {
      const absolute = path.posix.join(cwd, match);
      const content = await fs.readFile(absolute, "utf8");
      const finalPath = pathTx ? pathTx(match) : match;
      const finalContent = contentTx ? contentTx(content) : content;
      return {
        path: finalPath,
        content: finalContent,
      };
    })
  );
}

async function run() {
  // DTS

  const dtsFiles = await readGlob({
    pattern: "*.d.ts",
    cwd: distSyntax,
  });

  // TS

  const tsFiles = await readGlob({
    pattern: "*.ts",
    cwd: srcSyntax,
    contentTx: content =>
      content
        .replace(reReflection, `"edgedb/dist/reflection$1"`)
        .replace(reGenerated, `"../$1"`),
  });

  // CJS

  const cjsFiles = [
    ...(await readGlob({
      pattern: "*.js",
      cwd: distSyntax,
      contentTx: content =>
        content
          .replace(reReflection, `"edgedb/dist/reflection$1.js"`)
          .replace(reGenerated, `"../$1"`),
    })),
    ...dtsFiles,
  ];

  // ESM

  const esmFiles = [
    ...(await readGlob({
      pattern: "*.js",
      cwd: esmSyntax,
      pathTx: p => p.replace(/\.js/g, ".mjs"),
      contentTx: content =>
        content
          .replace(reReflection, `"edgedb/dist/reflection$1.js"`)
          .replace(reGenerated, `"../$1"`)
          .replace(reRelativeImports, `"$1.mjs"`),
    })),
    ...dtsFiles,
  ];

  // MTS

  const mtsFiles = await readGlob({
    pattern: "*.ts",
    cwd: srcSyntax,
    pathTx: p => p.replace(/\.ts/g, ".mts"),
    contentTx: content =>
      content
        .replace(reReflection, `"edgedb/dist/reflection$1.js"`)
        .replace(reGenerated, `"../$1"`)
        .replace(reRelativeImports, `"$1.mjs"`),
  });

  // DENO
  const denoFiles = await readGlob({
    pattern: "*.ts",
    cwd: srcSyntax,
    contentTx: content => {
      if (content.indexOf("Buffer") !== -1) {
        content = `import {Buffer} from "https://deno.land/std@0.114.0/node/buffer.ts";\n\n${content}`;
      }
      return content
        .replace(
          /"\.\.\/reflection([a-zA-Z0-9\.\_\/]*)"/g,
          `"edgedb/_src/reflection$1.ts"`
        )
        .replace(/"@generated\/(.*)"/g, `"../$1"`)
        .replace(reRelativeImports, `"$1.ts"`);
    },
  });

  if (DEBUG) {
    const files = tsFiles;
    for (const f of files) {
      const header = `####     ${f.path}     ####`;
      const bar = Array.from(Array(header.length))
        .map(() => "#")
        .join("");
      const abbr = f.content.split("\n").slice(0, 20).join("\n");
      console.log(bar);
      console.log(header);
      console.log(bar);
      console.log(`\n${abbr}\n\n`);
    }
  }

  if (!denoOnly) {
    const FILES: {[k: string]: Array<unknown>} = {
      deno: denoFiles,
      cjs: cjsFiles,
      esm: esmFiles,
      mts: mtsFiles,
      ts: tsFiles,
    };

    if (!FILES.deno.length) console.warn("No syntax files found for deno");
    if (!FILES.cjs.length) console.warn("No syntax files found for cjs");
    if (!FILES.esm.length) console.warn("No syntax files found for esm");
    if (!FILES.mts.length) console.warn("No syntax files found for mts");
    if (!FILES.ts.length) console.warn("No syntax files found for ts");
    await fs.writeFile(
      path.join(__dirname, "..", "dist", "reflection", "syntax.js"),
      `module.exports.syntax = ${JSON.stringify(FILES)}`
    );
  }

  if (!nodeOnly) {
    await fs.writeFile(
      path.join(
        __dirname,
        "..",
        "edgedb-deno",
        "_src",
        "reflection",
        "syntax.ts"
      ),
      `export const syntax: {[k: string]: {path: string; content: string}[]} = ${JSON.stringify(
        {deno: denoFiles}
      )}`
    );
  }

  console.log(`Generated syntax files.`);
}
run();
