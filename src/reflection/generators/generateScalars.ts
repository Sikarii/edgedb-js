import {genutil} from "../genutil";
import {GeneratorParams} from "./generateCastMaps";

export const generateScalars = async (params: GeneratorParams) => {
  const {dir, types, casts, scalars} = params;
  for (const type of types.values()) {
    if (type.kind !== "scalar") {
      continue;
    }

    const {mod, name} = genutil.splitName(type.name);
    const displayName = genutil.displayName(type.name);

    const sc = dir.getPath(`modules/${mod}.ts`);
    const scopeName = genutil.getScopedDisplayName(mod, sc);

    if (type.name === "std::anyenum") {
      sc.writeln(`
const ANYENUM_SYMBOL: unique symbol = Symbol("std::anyenum");
export interface Anyenum<
  TsType = unknown,
  Name extends string = string,
  Values extends [string, ...string[]] = [string, ...string[]]
> extends $.Materialtype<Name, TsType> {
  [ANYENUM_SYMBOL]: true;
  __values__: Values;
}`);
      sc.nl();
      continue;
    }
    if (type.is_abstract) {
      const scalarType = scalars.get(type.id);
      if (scalarType.children.length) {
        const scopedNames = scalarType.children.map((desc) =>
          scopeName(desc.name)
        );
        sc.writeln(`export type ${displayName} = ${scopedNames.join(" | ")};`);
        sc.nl();
      } else if (scalarType.bases.length) {
        // for std::sequence
        const bases = scalarType.bases.map((base) => scopeName(base.name));
        sc.writeln(
          `export interface ${displayName} extends ${bases.join(", ")} {}`
        );
        sc.nl();
      }

      continue;
    }

    sc.addImport(`import {reflection as $} from "edgedb";`);

    // generate enum
    if (type.enum_values && type.enum_values.length) {
      sc.writeln(`export enum ${name}Enum {`);
      sc.indented(() => {
        for (const val of type.enum_values) {
          sc.writeln(`${genutil.toIdent(val)} = ${genutil.quote(val)},`);
        }
      });
      sc.writeln(`}`);

      const valuesArr = `[${type.enum_values
        .map((v) => `"${v}"`)
        .join(", ")}]`;
      sc.writeln(
        `export type ${name} = typeof ${name}Enum & ${scopeName(
          "std::anyenum"
        )}<${name}Enum, "${type.name}", ${valuesArr}>;`
      );
      sc.writeln(
        `export const ${name}: ${name} = {...${name}Enum, __values__: ${valuesArr}} as any;`
      );

      sc.nl();
      continue;
    }

    // generate non-enum non-abstract scalar
    let jsType = genutil.toJsScalarType(type, types, mod, sc);
    sc.writeln(
      `export type ${displayName} = $.Materialtype<"${type.name}", ${jsType}>;`
    );

    sc.writeln(`export const ${displayName}: ${displayName} = {`);
    sc.writeln(`  __name__: "${type.name}",`);
    sc.writeln(`} as any;`);

    sc.nl();
  }
};