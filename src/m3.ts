type Intersect<T> = (T extends any
? (x: T) => void
: unknown) extends (x: infer R) => void
  ? R
  : never;

type UnpackDNF<T> = T extends any[]
  ? {
      [k in keyof T]: T[k] extends [any]
        ? T[k][number]
        : T[k] extends any[]
        ? Intersect<T[k][number]>
        : never;
    }[number]
  : never;

export enum Kind {
  computable,
  property,
  link,
}

export enum Cardinality {
  AtMostOne,
  One,
  Many,
  AtLeastOne,
}

export interface SchemaObject {
  kind: Kind;
  name: string;
}

export interface Pointer extends SchemaObject {
  cardinality: Cardinality;
}

export interface Computable<T> extends SchemaObject {
  kind: Kind.computable;
  __type: T;
}

export interface Property<scalar, C extends Cardinality> extends Pointer {
  kind: Kind.property;
  cardinality: C;
  name: string;
}

export interface Link<T extends any[][], C extends Cardinality>
  extends Pointer {
  kind: Kind.link;
  cardinality: C;
  target: T;
  name: string;
}

export type Parameter<T> = Computable<T> | Property<T, any>;

export type Expand<T> = T extends object
  ? T extends infer O
    ? {[K in keyof O]: Expand<O[K]>}
    : never
  : T;

type _UnpackBoolArg<Arg, T> = Arg extends true
  ? T
  : Arg extends false
  ? undefined
  : Arg extends boolean
  ? T | undefined
  : Arg extends Property<infer PPT, any>
  ? PPT
  : T;

type _OnlyArgs<Args, T> = {
  [k in keyof Args]: k extends keyof T ? never : k;
}[keyof Args];

type _Result<Args, T> = {
  [k in (keyof T & keyof Args) | _OnlyArgs<Args, T>]: k extends keyof T
    ? T[k] extends Property<infer PPT, any>
      ? _UnpackBoolArg<Args[k], PPT>
      : T[k] extends Link<infer LLT, any>
      ? _Result<Args[k], UnpackDNF<LLT>>
      : unknown
    : Args[k] extends Computable<infer CT>
    ? CT
    : never;
};

export type Result<Args, T> = Expand<_Result<Args, T>>;

export type MakeSelectArgs<T> = {
  [k in keyof T]?: T[k] extends Link<infer LT, infer LC>
    ?
        | Link<LT, LC>
        | MakeSelectArgs<UnpackDNF<LT>>
        | Computable<UnpackDNF<LT>>
        | boolean
    : T[k] extends Property<infer PT, infer PC>
    ? Property<PT, PC> | Computable<PT> | boolean
    : never;
};

function literal<T extends number | string | boolean | Date>(
  x: T
): Computable<T> {
  return {kind: "computable", args: [x]} as any;
}

const std = {
  ops: {
    plus: <T>(l: Parameter<T>, r: Parameter<T>): Computable<T> => {
      return {kind: "computable", args: [l, r], op: "plus"} as any;
    },
  } as const,
  len: <T>(l: Parameter<T>): Computable<number> => {
    return {kind: "computable", args: [l]} as any;
  },
} as const;

const bases = {
  User: {
    // will be auto-generated

    get name() {
      return {
        kind: Kind.property,
        name: "name",
        cardinality: Cardinality.One,
      } as Property<string, Cardinality.One>;
    },

    get email() {
      return {
        kind: Kind.property,
        name: "email",
        cardinality: Cardinality.One,
      } as Property<string, Cardinality.One>;
    },

    get age() {
      return {
        kind: Kind.property,
        name: "age",
        cardinality: Cardinality.One,
      } as Property<number, Cardinality.One>;
    },

    get friends() {
      return {
        kind: Kind.link,
        cardinality: Cardinality.Many,
        name: "friends",
        target: [[bases.User]],
      } as Link<[[typeof bases.User]], Cardinality.Many>;
    },

    get preferences() {
      return {
        kind: Kind.link,
        cardinality: Cardinality.AtMostOne,
        name: "preferences",
        target: [[bases.Preferences], [bases.LegacyPreferences]],
      } as Link<
        [[typeof bases.Preferences], [typeof bases.LegacyPreferences]],
        Cardinality.AtMostOne
      >;
    },
  } as const,

  LegacyPreferences: {
    get name() {
      return {
        kind: Kind.property,
        name: "name",
        cardinality: Cardinality.One,
      } as Property<string, Cardinality.One>;
    },

    get value() {
      return {
        kind: Kind.property,
        name: "value",
        cardinality: Cardinality.One,
      } as Property<string, Cardinality.One>;
    },

    get saveOnClose() {
      return {
        name: "saveOnClose",
        kind: Kind.property,
        cardinality: Cardinality.AtMostOne,
      } as Property<string, Cardinality.AtMostOne>;
    },
  },

  Preferences: {
    // will be auto-generated

    get name() {
      return {
        kind: Kind.property,
        name: "name",
        cardinality: Cardinality.One,
      } as Property<string, Cardinality.One>;
    },

    get emailNotifications() {
      return {
        name: "emailNotifications",
        kind: Kind.property,
        cardinality: Cardinality.One,
      } as Property<string, Cardinality.One>;
    },

    get saveOnClose() {
      return {
        name: "saveOnClose",
        kind: Kind.property,
        cardinality: Cardinality.AtMostOne,
      } as Property<string, Cardinality.AtMostOne>;
    },
  } as const,
};

const User = {
  ...bases.User,

  shape: <Spec extends MakeSelectArgs<typeof bases.User>>(
    spec: Spec
  ): Query<Result<Spec, typeof bases.User>> => {
    throw new Error("not implemented");
  },
} as const;

const Preferences = {
  ...bases.Preferences,

  shape: <Spec extends MakeSelectArgs<typeof bases.Preferences>>(
    spec: Spec
  ): Query<Result<Spec, typeof bases.Preferences>> => {
    throw new Error("not implemented");
  },
} as const;

const LegacyPreferences = {
  ...bases.LegacyPreferences,

  shape: <Spec extends MakeSelectArgs<typeof bases.LegacyPreferences>>(
    spec: Spec
  ): Query<Result<Spec, typeof bases.LegacyPreferences>> => {
    throw new Error("not implemented");
  },
} as const;

////////////////

export class Query<T> {
  _type!: T;

  filter(): Query<T> {
    return null as any;
  }
}

////////////////

// const results2 = User.shape({
//   email: User.email,
//   age: false,
//   name: 1 > 0,
//   friends: {
//     name: true,
//     age: 1 > 0,
//     friends: {
//       zzz: std.len(User.name),
//       zzz2: literal(42),
//       preferences: {
//         name: true,
//       },
//       friends: {
//         age: true,
//       },
//     },
//   },
//   preferences: {
//     name: true,
//     emailNotifications: true,
//   },
// });

/////////////

// type zzz<A1 = number, A2 = Array<[number, string]>> = {
//   key: A1;
//   key2: A2;
//   0: A1;
//   1: A2;
// };

// const f: zzz = (null as any) as zzz;

// const a = f.key2;

//////////////////////

// type NR<T extends object> = {[k in keyof T]: T[k] | undefined};

// function namedtuple<T extends object, R = Expand<NR<T>>>(P: T): R {
//   throw new Error("aaa");
// }

// const a = namedtuple({a: 1, b: "222"});

// ////////////////

// const inp = {a: 1, b: "aaa", z: new Date(), k: "aaaaa"};
// type input = typeof inp;

// type eee1 = keyof input;

// type Widen<T> = T extends boolean
//   ? boolean
//   : T extends string
//   ? string
//   : T extends number
//   ? number
//   : T;

// type TTTT<T, Z extends string[]> =
//   | {
//       [k in keyof Z]: Widen<T[Z[k] & keyof T]>;
//     }
//   | {[k in keyof T]: Widen<T[k]>};

// type R = TTTT<input, ["a", "b", "z", "k"]>;

// ////////

// type TupleFromUnion<T, S = any> = T extends S | any ? S : T;

// type aa = TupleFromUnion<"aaa" | "bbb">;

// // type RR = TTTT<input, TupleFromUnion<keyof input>;