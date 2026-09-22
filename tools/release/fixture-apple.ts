// The SwiftUI consumer fixture (roadmap P3-6; ADR-0014 "SPM by tag", agent/SKILL.md).
//
// `fixtures/swiftui-app/PrismFixture/` is an ordinary iOS app that adds Prism as a package dependency
// and uses it the way the skill tells an app to. This script is what builds it: it writes the Xcode
// project (the project is generated, not committed, because the one thing that differs between a
// rehearsal and a real consumer is the package reference) and then runs `xcodebuild` for the iOS
// simulator.
//
//   node release/fixture-apple.ts                       the package at this checkout, by path
//   node release/fixture-apple.ts --package tag \        the package as a consumer gets it: a git
//     --repo <path-or-url> --version 0.2.0               repository resolved at an exact tag
//
//   --work <dir>         derived data and resolved packages (default: a temporary directory)
//   --destination <d>    xcodebuild destination (default: generic/platform=iOS Simulator)
//   --keep               leave the generated project in place after a successful build
//   --print-project      write the project and stop, without building
//
// `--package tag` is what proves the SPM half of a release: SwiftPM resolves the tag, checks the
// version out and builds the app against exactly what the tag holds. A `file://` URL to a scratch
// clone is a repository like any other to SwiftPM, so the rehearsal needs no network and no push.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { REPO_ROOT, StampError, VERSION_PATTERN } from './targets.ts';

export const FIXTURE_DIR = 'fixtures/swiftui-app';
export const APP_NAME = 'PrismFixture';
export const BUNDLE_ID = 'com.example.prism.fixture';
/** The one product the fixture links; it brings DSCore, DSTokens and DSIcons with it. */
export const PRODUCT = 'DSComponents';

/** 24-character object ids, stable so a regenerated project is byte-identical. */
const ID = (n: number): string => `FEEDFACE0000${n.toString(16).toUpperCase().padStart(12, '0')}`;
const OBJ = {
  project: ID(1),
  mainGroup: ID(2),
  productsGroup: ID(3),
  target: ID(4),
  productRef: ID(5),
  sources: ID(6),
  frameworks: ID(7),
  resources: ID(8),
  projectConfigs: ID(9),
  targetConfigs: ID(10),
  projectDebug: ID(11),
  projectRelease: ID(12),
  targetDebug: ID(13),
  targetRelease: ID(14),
  syncGroup: ID(15),
  package: ID(16),
  productDependency: ID(17),
  buildFile: ID(18),
} as const;

export type PackageMode = 'local' | 'tag';

export interface FixtureAppleArgs {
  readonly root: string;
  readonly mode: PackageMode;
  /** A directory (local mode) or a git URL / path (tag mode). */
  readonly repo: string;
  readonly version: string | null;
  readonly work: string | null;
  readonly destination: string;
  readonly keep: boolean;
  readonly printProject: boolean;
}

export const USAGE =
  'usage: node release/fixture-apple.ts [--package local|tag] [--repo <path|url>] [--version <x.y.z>] [--work <dir>] [--destination <dest>] [--keep] [--print-project] [--root <dir>]';

export function parseArgs(argv: readonly string[]): FixtureAppleArgs | string {
  let root = REPO_ROOT;
  let mode: PackageMode = 'local';
  let repo: string | null = null;
  let version: string | null = null;
  let work: string | null = null;
  let destination = 'generic/platform=iOS Simulator';
  let keep = false;
  let printProject = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--keep') keep = true;
    else if (a === '--print-project') printProject = true;
    else if (a === '--package' || a === '--repo' || a === '--version' || a === '--work' || a === '--destination' || a === '--root') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return `${a} needs a value`;
      i++;
      if (a === '--package') {
        if (v !== 'local' && v !== 'tag') return `--package is local or tag, got ${JSON.stringify(v)}`;
        mode = v;
      } else if (a === '--repo') repo = v;
      else if (a === '--version') {
        if (!VERSION_PATTERN.test(v)) return `--version needs a x.y.z version, got ${JSON.stringify(v)}`;
        version = v;
      } else if (a === '--work') work = resolve(v);
      else if (a === '--destination') destination = v;
      else root = resolve(v);
    } else return `unknown argument ${a ?? ''}`;
  }
  if (mode === 'tag' && version === null) return '--package tag needs --version <x.y.z>: the tag a consumer resolves';
  return { root, mode, repo: repo ?? root, version, work, destination, keep, printProject };
}

/** A pbxproj value, quoted whenever it is not a bare identifier. */
function value(text: string): string {
  return /^[A-Za-z0-9_.]+$/.test(text) ? text : `"${text.replace(/["\\]/gu, '\\$&')}"`;
}

/** The package reference section and the `package =` line of the product dependency. */
function packageReference(args: FixtureAppleArgs, projectDir: string): { section: string; link: string } {
  if (args.mode === 'local') {
    const path = relative(projectDir, resolve(args.repo)) || '.';
    return {
      section: `/* Begin XCLocalSwiftPackageReference section */
		${OBJ.package} /* XCLocalSwiftPackageReference ${value(path)} */ = {
			isa = XCLocalSwiftPackageReference;
			relativePath = ${value(path)};
		};
/* End XCLocalSwiftPackageReference section */`,
      link: '',
    };
  }
  const url = args.repo.includes('://') ? args.repo : `file://${resolve(args.repo)}`;
  return {
    section: `/* Begin XCRemoteSwiftPackageReference section */
		${OBJ.package} /* XCRemoteSwiftPackageReference "prism" */ = {
			isa = XCRemoteSwiftPackageReference;
			repositoryURL = ${value(url)};
			requirement = {
				kind = exactVersion;
				version = ${value(args.version ?? '')};
			};
		};
/* End XCRemoteSwiftPackageReference section */`,
    link: `\n			package = ${OBJ.package} /* XCRemoteSwiftPackageReference "prism" */;`,
  };
}

const BUILD_SETTINGS = [
  'ALWAYS_SEARCH_USER_PATHS = NO',
  'CLANG_ENABLE_MODULES = YES',
  'CODE_SIGNING_ALLOWED = NO',
  'CODE_SIGNING_REQUIRED = NO',
  'ENABLE_USER_SCRIPT_SANDBOXING = YES',
  'GENERATE_INFOPLIST_FILE = YES',
  `INFOPLIST_KEY_CFBundleDisplayName = "Prism fixture"`,
  'INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES',
  'INFOPLIST_KEY_UILaunchScreen_Generation = YES',
  'INFOPLIST_KEY_UISupportedInterfaceOrientations = "UIInterfaceOrientationPortrait"',
  // The floor Package.swift declares (ADR-0003); a consumer below it would not resolve.
  'IPHONEOS_DEPLOYMENT_TARGET = 26.0',
  `PRODUCT_BUNDLE_IDENTIFIER = ${BUNDLE_ID}`,
  `PRODUCT_NAME = "$(TARGET_NAME)"`,
  'SDKROOT = iphoneos',
  'SUPPORTED_PLATFORMS = "iphonesimulator iphoneos"',
  'SWIFT_EMIT_LOC_STRINGS = YES',
  // The language mode the package's UI targets use; a consumer app on Swift 6 is the case that matters.
  'SWIFT_VERSION = 6.0',
  'TARGETED_DEVICE_FAMILY = "1,2"',
];

export function projectFile(args: FixtureAppleArgs, projectDir: string): string {
  const { section, link } = packageReference(args, projectDir);
  const settings = BUILD_SETTINGS.map((s) => `\t\t\t\t${s};`).join('\n');
  return `// !$*UTF8*$!
// Generated by tools/release/fixture-apple.ts (roadmap P3-6). Do not edit: regenerate it.
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 77;
	objects = {

/* Begin PBXBuildFile section */
		${OBJ.buildFile} /* ${PRODUCT} in Frameworks */ = {isa = PBXBuildFile; productRef = ${OBJ.productDependency} /* ${PRODUCT} */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		${OBJ.productRef} /* ${APP_NAME}.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = ${APP_NAME}.app; sourceTree = BUILT_PRODUCTS_DIR; };
/* End PBXFileReference section */

/* Begin PBXFileSystemSynchronizedRootGroup section */
		${OBJ.syncGroup} /* ${APP_NAME} */ = {isa = PBXFileSystemSynchronizedRootGroup; path = ${APP_NAME}; sourceTree = "<group>"; };
/* End PBXFileSystemSynchronizedRootGroup section */

/* Begin PBXFrameworksBuildPhase section */
		${OBJ.frameworks} /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
				${OBJ.buildFile} /* ${PRODUCT} in Frameworks */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		${OBJ.mainGroup} = {
			isa = PBXGroup;
			children = (
				${OBJ.syncGroup} /* ${APP_NAME} */,
				${OBJ.productsGroup} /* Products */,
			);
			sourceTree = "<group>";
		};
		${OBJ.productsGroup} /* Products */ = {
			isa = PBXGroup;
			children = (
				${OBJ.productRef} /* ${APP_NAME}.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		${OBJ.target} /* ${APP_NAME} */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = ${OBJ.targetConfigs} /* Build configuration list for PBXNativeTarget "${APP_NAME}" */;
			buildPhases = (
				${OBJ.sources} /* Sources */,
				${OBJ.frameworks} /* Frameworks */,
				${OBJ.resources} /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			fileSystemSynchronizedGroups = (
				${OBJ.syncGroup} /* ${APP_NAME} */,
			);
			name = ${APP_NAME};
			packageProductDependencies = (
				${OBJ.productDependency} /* ${PRODUCT} */,
			);
			productName = ${APP_NAME};
			productReference = ${OBJ.productRef} /* ${APP_NAME}.app */;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		${OBJ.project} /* Project object */ = {
			isa = PBXProject;
			attributes = {
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 2660;
				LastUpgradeCheck = 2660;
				TargetAttributes = {
					${OBJ.target} = {
						CreatedOnToolsVersion = 26.0;
					};
				};
			};
			buildConfigurationList = ${OBJ.projectConfigs} /* Build configuration list for PBXProject "${APP_NAME}" */;
			compatibilityVersion = "Xcode 15.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = ${OBJ.mainGroup};
			minimizedProjectReferenceProxies = 1;
			packageReferences = (
				${OBJ.package} /* Prism */,
			);
			preferredProjectObjectVersion = 77;
			productRefGroup = ${OBJ.productsGroup} /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				${OBJ.target} /* ${APP_NAME} */,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		${OBJ.resources} /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		${OBJ.sources} /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		${OBJ.projectDebug} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ONLY_ACTIVE_ARCH = YES;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
			};
			name = Debug;
		};
		${OBJ.projectRelease} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				SWIFT_COMPILATION_MODE = wholemodule;
			};
			name = Release;
		};
		${OBJ.targetDebug} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
${settings}
			};
			name = Debug;
		};
		${OBJ.targetRelease} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
${settings}
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		${OBJ.projectConfigs} /* Build configuration list for PBXProject "${APP_NAME}" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${OBJ.projectDebug} /* Debug */,
				${OBJ.projectRelease} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		${OBJ.targetConfigs} /* Build configuration list for PBXNativeTarget "${APP_NAME}" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${OBJ.targetDebug} /* Debug */,
				${OBJ.targetRelease} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */

${section}

/* Begin XCSwiftPackageProductDependency section */
		${OBJ.productDependency} /* ${PRODUCT} */ = {
			isa = XCSwiftPackageProductDependency;${link}
			productName = ${PRODUCT};
		};
/* End XCSwiftPackageProductDependency section */
	};
	rootObject = ${OBJ.project} /* Project object */;
}
`;
}

/** A shared scheme, so `xcodebuild -scheme ${APP_NAME}` works on a project nobody has opened. */
export function schemeFile(projectName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion = "2660" version = "1.7">
   <BuildAction parallelizeBuildables = "YES" buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry buildForTesting = "YES" buildForRunning = "YES" buildForProfiling = "YES" buildForArchiving = "YES" buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "${OBJ.target}"
               BuildableName = "${APP_NAME}.app"
               BlueprintName = "${APP_NAME}"
               ReferencedContainer = "container:${projectName}">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <LaunchAction buildConfiguration = "Debug" selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle = "0" useCustomWorkingDirectory = "NO" ignoresPersistentStateOnLaunch = "NO" debugDocumentVersioning = "YES" debugServiceExtension = "internal" allowLocationSimulation = "YES">
      <BuildableProductRunnable runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "${OBJ.target}"
            BuildableName = "${APP_NAME}.app"
            BlueprintName = "${APP_NAME}"
            ReferencedContainer = "container:${projectName}">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <AnalyzeAction buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction buildConfiguration = "Release" revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
`;
}

export interface FixtureAppleResult {
  readonly project: string;
  readonly work: string;
  readonly app: string | null;
  readonly resolved: string | null;
}

export function writeProject(args: FixtureAppleArgs): string {
  const fixture = join(args.root, FIXTURE_DIR);
  if (!existsSync(join(fixture, APP_NAME, 'PrismFixtureApp.swift'))) {
    throw new StampError(`${FIXTURE_DIR}/${APP_NAME} is not there: the fixture's sources are committed, the project is not`);
  }
  const project = join(fixture, `${APP_NAME}.xcodeproj`);
  rmSync(project, { recursive: true, force: true });
  mkdirSync(join(project, 'xcshareddata', 'xcschemes'), { recursive: true });
  writeFileSync(join(project, 'project.pbxproj'), projectFile(args, fixture), 'utf8');
  writeFileSync(join(project, 'xcshareddata', 'xcschemes', `${APP_NAME}.xcscheme`), schemeFile(`${APP_NAME}.xcodeproj`), 'utf8');
  return project;
}

export function build(args: FixtureAppleArgs): FixtureAppleResult {
  const project = writeProject(args);
  if (args.printProject) return { project, work: '', app: null, resolved: null };
  const work = args.work ?? mkdtempSync(join(tmpdir(), 'prism-fixture-apple-'));
  mkdirSync(work, { recursive: true });
  const derived = join(work, 'DerivedData');
  execFileSync(
    'xcodebuild',
    [
      'build',
      '-project', project,
      '-scheme', APP_NAME,
      '-configuration', 'Debug',
      '-destination', args.destination,
      '-derivedDataPath', derived,
      '-clonedSourcePackagesDirPath', join(work, 'SourcePackages'),
      '-skipMacroValidation',
      'CODE_SIGNING_ALLOWED=NO',
    ],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  );
  const app = join(derived, 'Build', 'Products', 'Debug-iphonesimulator', `${APP_NAME}.app`);
  const resolvedPath = join(project, 'project.xcworkspace', 'xcshareddata', 'swiftpm', 'Package.resolved');
  const resolved = existsSync(resolvedPath) ? readFileSync(resolvedPath, 'utf8') : null;
  if (!existsSync(app)) throw new StampError(`xcodebuild reported success but ${app} is not there`);
  if (!args.keep) {
    // The built app is the evidence; keep a copy beside the derived data and drop the project.
    cpSync(app, join(work, `${APP_NAME}.app`), { recursive: true });
    rmSync(project, { recursive: true, force: true });
  }
  return { project, work, app: args.keep ? app : join(work, `${APP_NAME}.app`), resolved };
}

export interface Io {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

const defaultIo: Io = { out: (l) => console.log(l), err: (l) => console.error(l) };

export function main(argv: readonly string[], io: Io = defaultIo): number {
  const args = parseArgs(argv);
  if (typeof args === 'string') {
    io.err(`fixture-apple: ${args}\n${USAGE}`);
    return 2;
  }
  try {
    const result = build(args);
    io.out(`fixture-apple: project ${result.project}`);
    if (args.printProject) return 0;
    io.out(`fixture-apple: built ${result.app ?? '?'}`);
    if (args.mode === 'tag') io.out(`fixture-apple: resolved ${args.repo} at ${args.version ?? '?'}`);
    return 0;
  } catch (e) {
    io.err(`fixture-apple: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
