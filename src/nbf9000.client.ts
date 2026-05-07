declare function getgenv(): { nbf9000?: Runtime; config?: Config };
declare function gethui(): Instance;
declare function sethiddenproperty(obj: Instance, prop: string, val: unknown): void;
declare function getcustomasset(path: string): string;
declare function isfile(path: string): boolean;
declare function readfile(path: string): string;
declare function writefile(path: string, data: string): void;
declare function makefolder(path: string): void;

type Method = "NaN" | "skidfling";
type Tgt = Instance | CFrame | Vector3;
type PlatformMode = "auto" | "pc" | "mobile";
type TargetPriority = "mouse" | "closest" | "camera";
type ThemeName = "Tokyo Night" | "RGB" | "ALONE" | "Crimson" | "r/masterhacker" | "Homer Simpson" | "Light RGB" | "Light ALONE" | "Roserika" | "FastTracker II Blue" | "Cherry Blossom" | "Sakura" | "Tomorrow Night 80s";

interface Runtime {
	stop?: () => void;
	fling?: (tgt: Tgt, dur?: number) => boolean | undefined;
	clear?: () => void;
	oldDestroyHeight?: number;
	sessionModel?: Model;
	util?: {
		predict?: (tgt: Tgt) => LuaTuple<[CFrame, boolean]>;
		getPart?: (tgt: Tgt) => BasePart | undefined;
	};
}

interface Config {
	intro?: boolean;
	method?: Method;
	showHRPs?: boolean;
	clickThroughWalls?: boolean;
	showGuide?: boolean;
	showWatermark?: boolean;
	autoRefling?: boolean;
	autoDetectFling?: boolean;
	flingPrediction?: boolean;
	manualFlingDuration?: number;
	skidPrediction?: boolean;
	antiFling?: boolean;
	repeatSameTarget?: boolean;
	preferClosestPart?: boolean;
	requireAliveTarget?: boolean;
	teamCheck?: boolean;
	hideRealCharacter?: boolean;
	clearInputOnMenu?: boolean;
	lowMotion?: boolean;
	theme?: ThemeName;
	targetPriority?: TargetPriority;
	platformMode?: PlatformMode;
	mobileFlingTool?: boolean;
	mobileFlingAllTool?: boolean;
	mobileCancelTool?: boolean;
	menuKey?: string;
	flingKey?: string;
	flingAllKey?: string;
	clearQueueKey?: string;
	cancelFlingKey?: string;
}

interface QueueItem {
	tgt: Tgt;
	dur?: number;
	end?: number;
	start?: number;
	startPos?: Vector3;
	lastPosition?: Vector3;
	lastCFrame?: CFrame;
	player?: Player;
	repeat?: boolean;
	batch?: boolean;
	batchToken?: number;
}

interface SavedHumanoidState {
	hum: Humanoid;
	autoRotate: boolean;
	walkSpeed: number;
	jumpPower: number;
	jumpHeight: number;
	useJumpPower: boolean;
	requiresNeck: boolean;
	breakJointsOnDeath: boolean;
}

interface SavedPartState {
	transparency: number;
	collision: boolean;
}

const env = getgenv();
const configPath = "assets/nbf9000-config.json";
let configSaveQueued = false;
const hadEnvConfig = env.config !== undefined;
const config = env.config ?? (env.config = {
	intro: true,
	method: "NaN" as Method,
	showHRPs: false,
	clickThroughWalls: false,
	showGuide: true,
	showWatermark: true,
	autoRefling: true,
	autoDetectFling: true,
	flingPrediction: true,
	manualFlingDuration: 2,
	antiFling: false,
	repeatSameTarget: false,
	preferClosestPart: true,
	requireAliveTarget: true,
	teamCheck: false,
	hideRealCharacter: true,
	clearInputOnMenu: true,
	lowMotion: false,
	theme: "Tokyo Night" as ThemeName,
	targetPriority: "mouse" as TargetPriority,
	platformMode: "auto" as PlatformMode,
	mobileFlingTool: true,
	mobileFlingAllTool: true,
	mobileCancelTool: true,
	menuKey: "RightShift",
	flingKey: "Ctrl+MouseButton1",
	flingAllKey: "Ctrl+F",
	clearQueueKey: "Backspace",
	cancelFlingKey: "Q",
});

if (config.intro === undefined) config.intro = true;
if (config.method === undefined) config.method = "NaN";
if ((config.method as unknown) !== "NaN" && (config.method as unknown) !== "skidfling") config.method = "NaN";
if (config.showHRPs === undefined) config.showHRPs = false;
if (config.clickThroughWalls === undefined) config.clickThroughWalls = false;
if (config.showGuide === undefined) config.showGuide = true;
if (config.showWatermark === undefined) config.showWatermark = true;
if (config.autoRefling === undefined) config.autoRefling = true;
if (config.autoDetectFling === undefined) config.autoDetectFling = true;
if (config.flingPrediction === undefined) config.flingPrediction = config.skidPrediction ?? true;
if (config.manualFlingDuration === undefined) config.manualFlingDuration = 2;
if (config.antiFling === undefined) config.antiFling = false;
if (config.repeatSameTarget === undefined) config.repeatSameTarget = false;
if (config.preferClosestPart === undefined) config.preferClosestPart = true;
if (config.requireAliveTarget === undefined) config.requireAliveTarget = true;
if (config.teamCheck === undefined) config.teamCheck = false;
if (config.hideRealCharacter === undefined) config.hideRealCharacter = true;
if (config.clearInputOnMenu === undefined) config.clearInputOnMenu = true;
if (config.lowMotion === undefined) config.lowMotion = false;
if (config.theme === undefined) config.theme = "Tokyo Night";
if (config.targetPriority === undefined) config.targetPriority = "mouse";
if (config.platformMode === undefined) config.platformMode = "auto";
if (config.mobileFlingTool === undefined) config.mobileFlingTool = true;
if (config.mobileFlingAllTool === undefined) config.mobileFlingAllTool = true;
if (config.mobileCancelTool === undefined) config.mobileCancelTool = true;
if (config.menuKey === undefined) config.menuKey = "RightShift";
if (config.flingKey === undefined) config.flingKey = "Ctrl+MouseButton1";
if (config.flingAllKey === undefined) config.flingAllKey = "Ctrl+F";
if (config.clearQueueKey === undefined) config.clearQueueKey = "Backspace";
if (config.cancelFlingKey === undefined) config.cancelFlingKey = "Q";

let method: Method = config.method === "skidfling" ? "skidfling" : "NaN";


const anims = {
	R6: {
		idle: "rbxassetid://180435571",
		idleAlt: "rbxassetid://180435792",
		walk: "rbxassetid://180426354",
		run: undefined as string | undefined,
		jump: "rbxassetid://125750702",
		fall: "rbxassetid://180436148",
	},
	R15: {
		idle: "rbxassetid://507766666",
		walk: "rbxassetid://507777826",
		run: "rbxassetid://507767714",
		jump: "rbxassetid://507765000",
		fall: "rbxassetid://507767968",
	},
};

const players = game.GetService("Players");
const runService = game.GetService("RunService");
const inputService = game.GetService("UserInputService");
const guiService = game.GetService("GuiService");
const tweenService = game.GetService("TweenService");
const world = game.GetService("Workspace");
const debrisService = game.GetService("Debris");
const soundService = game.GetService("SoundService");

const localPlayer = players.LocalPlayer;
const mouse = localPlayer.GetMouse();
let cam = world.CurrentCamera;

const oldRuntime = env.nbf9000;
let oldStop: (() => void) | undefined;
let oldDestroyHeight = world.FallenPartsDestroyHeight;
if (oldRuntime) {
	oldStop = oldRuntime.stop;
	if (oldRuntime.oldDestroyHeight !== undefined) oldDestroyHeight = oldRuntime.oldDestroyHeight;
}
const originalDestroyHeight = oldDestroyHeight !== oldDestroyHeight ? -500 : oldDestroyHeight;
let destroyHeightSet = false;

if (oldStop) pcall(oldStop);

function setDestroyH(v: number) {
	(world as unknown as { FallenPartsDestroyHeight: number }).FallenPartsDestroyHeight = v;
}

function setFlingDestroyH() {
	if (destroyHeightSet) return;
	setDestroyH(0 / 0);
	destroyHeightSet = true;
}

const runtime = {} as Runtime;
const connections = new Array<RBXScriptConnection>();
const queue = new Array<QueueItem>();
const cooldowns = new Set<Instance>();
const savedPartState = new Map<BasePart, SavedPartState>();
const savedScriptDisabled = new Map<BaseScript, boolean>();
const targetCollision = new Map<BasePart, boolean>();
const antiFlingCollision = new Map<BasePart, boolean>();

let sessionModel: Model | undefined;
let sessionRootAnchored = false;
let sessionAnchorFrames = 0;
let guidePart: BasePart | undefined;
let guideOutline: SelectionBox | undefined;
let guideOutlineAlt: SelectionBox | undefined;
let guideTick = os.clock();
let introGui: ScreenGui | undefined;
let introConn: RBXScriptConnection | undefined;
let introSound: Sound | undefined;
let settingsGui: ScreenGui | undefined;
let settingsRoot: Frame | undefined;
let settingsGlow: Frame | undefined;
let settingsConn: RBXScriptConnection | undefined;
let settingsKeyListening = false;
const settingsConnections = new Array<RBXScriptConnection>();
const mobileTools = new Array<Tool>();
const mobileToolConnections = new Array<RBXScriptConnection>();
let watermarkGui: ScreenGui | undefined;
let watermarkConn: RBXScriptConnection | undefined;
let watermarkLabel: TextLabel | undefined;
let watermarkStroke: UIStroke | undefined;
let savedHumanoidState: SavedHumanoidState | undefined;
let maskedChar: Model | undefined;
let deathConn: RBXScriptConnection | undefined;
let busy = false;
let flingAllToken = 0;
let skidHoldCFrame: CFrame | undefined;
let skidTweenLastClock = os.clock();
let lastInput: InputObject | undefined;
let lastWasGui = false;
let lastTapTime = 0;
let lastTapPos = Vector3.zero;
const hrpOutlines = new Map<Player, SelectionBox>();
const guideSpinOffset = new Vector3(math.random(), math.random(), math.random()).mul(math.pi * 2);
const mainTrackPhaseKey = "__nbf9000_main_phase";
const themeNames = [
	"Tokyo Night",
	"RGB",
	"ALONE",
	"Crimson",
	"r/masterhacker",
	"Homer Simpson",
	"Light RGB",
	"Light ALONE",
	"Roserika",
	"FastTracker II Blue",
	"Cherry Blossom",
	"Sakura",
	"Tomorrow Night 80s",
] as Array<ThemeName>;

const keys = {
	w: false, a: false, s: false, d: false,
	jump: false, stick: Vector2.zero, padJump: false,
	move: Vector3.zero, wantJump: false,
};

function track(c: RBXScriptConnection) {
	connections.push(c);
	return c;
}

function wrap(n: number) {
	return ((n % 1) + 1) % 1;
}

interface UiTheme {
	bg: Color3;
	top: Color3;
	surface: Color3;
	depth: Color3;
	text: Color3;
	muted: Color3;
	soft: Color3;
	scroll: Color3;
	accent: Array<Color3>;
}

function rgb(r: number, g: number, b: number) {
	return Color3.fromRGB(r, g, b);
}

function currentThemeName() {
	const name = config.theme;
	for (const theme of themeNames) {
		if (name === theme) return theme;
	}
	return "Tokyo Night" as ThemeName;
}

function currentTheme(): UiTheme {
	const white = rgb(245, 245, 250);
	switch (currentThemeName()) {
		case "RGB":
			return { bg: rgb(5, 5, 8), top: rgb(0, 0, 0), surface: rgb(9, 9, 14), depth: rgb(18, 18, 24), text: white, muted: rgb(178, 180, 190), soft: rgb(104, 108, 124), scroll: rgb(255, 255, 255), accent: [rgb(255, 64, 86), rgb(255, 199, 64), rgb(84, 255, 122), rgb(80, 210, 255), rgb(178, 112, 255)] };
		case "ALONE":
			return { bg: rgb(0, 0, 0), top: rgb(4, 4, 4), surface: rgb(5, 5, 5), depth: rgb(17, 17, 17), text: white, muted: rgb(184, 184, 184), soft: rgb(96, 96, 96), scroll: white, accent: [white, rgb(188, 188, 188), rgb(255, 255, 255)] };
		case "Crimson":
			return { bg: rgb(15, 0, 3), top: rgb(22, 0, 5), surface: rgb(12, 0, 4), depth: rgb(28, 4, 9), text: rgb(255, 236, 240), muted: rgb(204, 128, 142), soft: rgb(122, 55, 66), scroll: rgb(255, 64, 86), accent: [rgb(255, 33, 72), rgb(255, 91, 105), rgb(180, 0, 42)] };
		case "r/masterhacker":
			return { bg: rgb(0, 9, 0), top: rgb(0, 15, 0), surface: rgb(0, 10, 0), depth: rgb(0, 22, 0), text: rgb(188, 255, 188), muted: rgb(79, 214, 79), soft: rgb(28, 108, 28), scroll: rgb(0, 255, 64), accent: [rgb(0, 255, 70), rgb(90, 255, 144), rgb(0, 156, 48)] };
		case "Homer Simpson":
			return { bg: rgb(255, 239, 48), top: rgb(255, 218, 35), surface: rgb(255, 232, 57), depth: rgb(255, 246, 126), text: rgb(18, 18, 18), muted: rgb(66, 61, 35), soft: rgb(125, 112, 41), scroll: rgb(18, 18, 18), accent: [rgb(0, 90, 180), rgb(255, 255, 255), rgb(230, 70, 60)] };
		case "Light RGB":
			return { bg: rgb(246, 248, 255), top: rgb(238, 241, 250), surface: rgb(255, 255, 255), depth: rgb(234, 238, 248), text: rgb(10, 14, 24), muted: rgb(78, 86, 104), soft: rgb(145, 153, 170), scroll: rgb(80, 120, 255), accent: [rgb(255, 64, 86), rgb(255, 184, 64), rgb(42, 206, 100), rgb(45, 150, 255), rgb(160, 86, 255)] };
		case "Light ALONE":
			return { bg: rgb(250, 250, 250), top: rgb(238, 238, 238), surface: rgb(255, 255, 255), depth: rgb(232, 232, 232), text: rgb(0, 0, 0), muted: rgb(68, 68, 68), soft: rgb(142, 142, 142), scroll: rgb(0, 0, 0), accent: [rgb(0, 0, 0), rgb(94, 94, 94), rgb(0, 0, 0)] };
		case "Roserika":
			return { bg: rgb(38, 18, 4), top: rgb(54, 25, 5), surface: rgb(32, 14, 3), depth: rgb(72, 34, 8), text: rgb(255, 238, 215), muted: rgb(221, 154, 90), soft: rgb(132, 81, 36), scroll: rgb(255, 155, 54), accent: [rgb(255, 153, 43), rgb(255, 205, 107), rgb(84, 34, 5)] };
		case "FastTracker II Blue":
			return { bg: rgb(26, 31, 94), top: rgb(36, 42, 130), surface: rgb(22, 28, 86), depth: rgb(54, 63, 156), text: rgb(242, 245, 255), muted: rgb(170, 181, 255), soft: rgb(99, 110, 206), scroll: rgb(160, 176, 255), accent: [rgb(102, 110, 255), rgb(150, 170, 255), rgb(51, 55, 128)] };
		case "Cherry Blossom":
			return { bg: rgb(255, 224, 244), top: rgb(247, 171, 232), surface: rgb(255, 238, 249), depth: rgb(250, 203, 238), text: rgb(82, 28, 56), muted: rgb(117, 40, 75), soft: rgb(168, 93, 129), scroll: rgb(117, 40, 75), accent: [rgb(117, 40, 75), rgb(247, 171, 232), rgb(255, 255, 255)] };
		case "Sakura":
			return { bg: rgb(42, 13, 29), top: rgb(76, 28, 52), surface: rgb(35, 12, 26), depth: rgb(92, 35, 63), text: rgb(255, 237, 248), muted: rgb(247, 171, 232), soft: rgb(154, 86, 124), scroll: rgb(247, 171, 232), accent: [rgb(247, 171, 232), rgb(255, 220, 246), rgb(117, 40, 75)] };
		case "Tomorrow Night 80s":
			return { bg: rgb(39, 39, 39), top: rgb(45, 45, 45), surface: rgb(33, 33, 33), depth: rgb(52, 52, 52), text: rgb(222, 222, 222), muted: rgb(190, 190, 190), soft: rgb(115, 115, 115), scroll: rgb(190, 190, 190), accent: [rgb(204, 102, 102), rgb(240, 198, 116), rgb(181, 189, 104), rgb(129, 162, 190), rgb(178, 148, 187)] };
		default:
			return { bg: rgb(22, 22, 33), top: rgb(15, 15, 24), surface: rgb(8, 9, 15), depth: rgb(17, 17, 27), text: rgb(235, 235, 245), muted: rgb(174, 176, 190), soft: rgb(110, 112, 130), scroll: rgb(160, 180, 255), accent: [rgb(122, 162, 247), rgb(125, 207, 255), rgb(187, 154, 247), rgb(247, 118, 142), rgb(224, 175, 104)] };
	}
}

function accentColor(n: number) {
	const colors = currentTheme().accent;
	const x = wrap(n) * colors.size();
	const i = math.floor(x);
	const a = x - i;
	return colors[i].Lerp(colors[(i + 1) % colors.size()], a);
}

function accentSequence() {
	const colors = currentTheme().accent;
	const points = new Array<ColorSequenceKeypoint>();
	for (let i = 0; i < colors.size(); i++) {
		points.push(new ColorSequenceKeypoint(colors.size() === 1 ? 0 : i / (colors.size() - 1), colors[i]));
	}
	return new ColorSequence(points);
}

function accentLoopSequence() {
	const colors = currentTheme().accent;
	const points = new Array<ColorSequenceKeypoint>();
	for (let i = 0; i <= colors.size(); i++) {
		points.push(new ColorSequenceKeypoint(i / colors.size(), colors[i % colors.size()]));
	}
	return new ColorSequence(points);
}

function accentGradient(parent: Instance, rot = 0) {
	const g = new Instance("UIGradient");
	g.Color = accentSequence();
	g.Rotation = rot;
	g.Parent = parent;
	return g;
}

function charParts(char?: Model): LuaTuple<[Humanoid | undefined, BasePart | undefined]> {
	const hum = char?.FindFirstChildOfClass("Humanoid");
	const rp = hum?.RootPart ?? char?.FindFirstChild("HumanoidRootPart");
	return $tuple(hum, rp?.IsA("BasePart") ? rp : undefined);
}

function isDead(hum?: Humanoid) {
	if (!hum) return false;
	return hum.Health <= 0 || hum.GetState() === Enum.HumanoidStateType.Dead;
}

function clearGuide() {
	if (guideOutline) guideOutline.Destroy();
	if (guideOutlineAlt) guideOutlineAlt.Destroy();
	if (guidePart) guidePart.Destroy();
	guideOutline = undefined;
	guideOutlineAlt = undefined;
	guidePart = undefined;
}

function releaseGuide() {
	const p = guidePart;
	if (!p) return;
	guidePart = undefined;
	guideOutline = undefined;
	guideTick = os.clock();
	p.Anchored = false;
	p.Massless = false;
	p.CanCollide = false;
	p.CanTouch = false;
	p.CanQuery = false;
	p.AssemblyLinearVelocity = new Vector3(0, -135, 0);
	p.AssemblyAngularVelocity = new Vector3(math.random(-14, 14), math.random(-22, 22), math.random(-14, 14));
	p.Velocity = p.AssemblyLinearVelocity;
	p.RotVelocity = p.AssemblyAngularVelocity;
	debrisService.AddItem(p, 2.5);
}

function loadSavedConfig() {
	const [hasFile, fileOk] = pcall(() => isfile(configPath));
	if (!hasFile || !fileOk) return {} as Partial<Config>;
	const [readOk, raw] = pcall(() => readfile(configPath));
	if (!readOk || !typeIs(raw, "string") || raw.size() < 2) return {} as Partial<Config>;
	const [decodeOk, decoded] = pcall(() => game.GetService("HttpService").JSONDecode(raw));
	if (!decodeOk || !typeIs(decoded, "table")) return {} as Partial<Config>;
	return decoded as Partial<Config>;
}

function savedBool(saved: Partial<Config>, key: keyof Config, fallback: boolean) {
	const v = saved[key];
	return typeIs(v, "boolean") ? v : fallback;
}

function savedString(saved: Partial<Config>, key: keyof Config, fallback: string) {
	const v = saved[key];
	return typeIs(v, "string") && v.size() > 0 ? v : fallback;
}

function savedNumber(saved: Partial<Config>, key: keyof Config, fallback: number, min: number, max: number) {
	const v = saved[key];
	return typeIs(v, "number") ? math.clamp(v, min, max) : fallback;
}

function savedMethod(saved: Partial<Config>) {
	return savedString(saved, "method", "NaN") === "skidfling" ? "skidfling" as Method : "NaN" as Method;
}

function savedTargetPriority(saved: Partial<Config>) {
	const v = savedString(saved, "targetPriority", "mouse");
	return (v === "closest" || v === "camera" || v === "mouse") ? v as TargetPriority : "mouse" as TargetPriority;
}

function savedPlatformMode(saved: Partial<Config>) {
	const v = savedString(saved, "platformMode", "auto");
	return (v === "pc" || v === "mobile" || v === "auto") ? v as PlatformMode : "auto" as PlatformMode;
}

function savedTheme(saved: Partial<Config>) {
	const v = savedString(saved, "theme", "Tokyo Night");
	for (const theme of themeNames) {
		if (v === theme) return theme;
	}
	return "Tokyo Night" as ThemeName;
}

function applySavedConfig(saved: Partial<Config>) {
	config.intro = savedBool(saved, "intro", config.intro !== false);
	config.method = savedMethod(saved);
	config.showHRPs = savedBool(saved, "showHRPs", config.showHRPs === true);
	config.clickThroughWalls = savedBool(saved, "clickThroughWalls", config.clickThroughWalls === true);
	config.showGuide = savedBool(saved, "showGuide", config.showGuide !== false);
	config.showWatermark = savedBool(saved, "showWatermark", config.showWatermark !== false);
	config.autoRefling = savedBool(saved, "autoRefling", config.autoRefling !== false);
	config.autoDetectFling = savedBool(saved, "autoDetectFling", config.autoDetectFling !== false);
	config.flingPrediction = savedBool(saved, "flingPrediction", savedBool(saved, "skidPrediction", config.flingPrediction !== false));
	config.manualFlingDuration = savedNumber(saved, "manualFlingDuration", config.manualFlingDuration ?? 2, 0.25, 8);
	config.antiFling = savedBool(saved, "antiFling", config.antiFling === true);
	config.repeatSameTarget = savedBool(saved, "repeatSameTarget", config.repeatSameTarget === true);
	config.preferClosestPart = savedBool(saved, "preferClosestPart", config.preferClosestPart !== false);
	config.requireAliveTarget = savedBool(saved, "requireAliveTarget", config.requireAliveTarget !== false);
	config.teamCheck = savedBool(saved, "teamCheck", config.teamCheck === true);
	config.hideRealCharacter = savedBool(saved, "hideRealCharacter", config.hideRealCharacter !== false);
	config.clearInputOnMenu = savedBool(saved, "clearInputOnMenu", config.clearInputOnMenu !== false);
	config.lowMotion = savedBool(saved, "lowMotion", config.lowMotion === true);
	config.theme = savedTheme(saved);
	config.targetPriority = savedTargetPriority(saved);
	config.platformMode = savedPlatformMode(saved);
	config.mobileFlingTool = savedBool(saved, "mobileFlingTool", config.mobileFlingTool !== false);
	config.mobileFlingAllTool = savedBool(saved, "mobileFlingAllTool", config.mobileFlingAllTool !== false);
	config.mobileCancelTool = savedBool(saved, "mobileCancelTool", config.mobileCancelTool !== false);
	config.menuKey = savedString(saved, "menuKey", config.menuKey ?? "RightShift");
	config.flingKey = savedString(saved, "flingKey", config.flingKey ?? "Ctrl+MouseButton1");
	config.flingAllKey = savedString(saved, "flingAllKey", config.flingAllKey ?? "Ctrl+F");
	config.clearQueueKey = savedString(saved, "clearQueueKey", config.clearQueueKey ?? "Backspace");
	config.cancelFlingKey = savedString(saved, "cancelFlingKey", config.cancelFlingKey ?? "Q");
	if ((config.method as unknown) !== "NaN" && (config.method as unknown) !== "skidfling") config.method = "NaN";
}

if (!hadEnvConfig) {
	applySavedConfig(loadSavedConfig());
	method = config.method === "skidfling" ? "skidfling" : "NaN";
}

function configSnapshot() {
	return {
		intro: config.intro,
		method: config.method,
		showHRPs: config.showHRPs,
		clickThroughWalls: config.clickThroughWalls,
		showGuide: config.showGuide,
		showWatermark: config.showWatermark,
		autoRefling: config.autoRefling,
		autoDetectFling: config.autoDetectFling,
		flingPrediction: config.flingPrediction,
		manualFlingDuration: config.manualFlingDuration,
		antiFling: config.antiFling,
		repeatSameTarget: config.repeatSameTarget,
		preferClosestPart: config.preferClosestPart,
		requireAliveTarget: config.requireAliveTarget,
		teamCheck: config.teamCheck,
		hideRealCharacter: config.hideRealCharacter,
		clearInputOnMenu: config.clearInputOnMenu,
		lowMotion: config.lowMotion,
		theme: config.theme,
		targetPriority: config.targetPriority,
		platformMode: config.platformMode,
		mobileFlingTool: config.mobileFlingTool,
		mobileFlingAllTool: config.mobileFlingAllTool,
		mobileCancelTool: config.mobileCancelTool,
		menuKey: config.menuKey,
		flingKey: config.flingKey,
		flingAllKey: config.flingAllKey,
		clearQueueKey: config.clearQueueKey,
		cancelFlingKey: config.cancelFlingKey,
	};
}

function saveConfigNow() {
	pcall(() => makefolder("assets"));
	const [ok, data] = pcall(() => game.GetService("HttpService").JSONEncode(configSnapshot()));
	if (ok && typeIs(data, "string")) pcall(() => writefile(configPath, data));
}

function saveConfigSoon() {
	if (configSaveQueued) return;
	configSaveQueued = true;
	task.delay(0.08, () => {
		configSaveQueued = false;
		saveConfigNow();
	});
}

function settingsTrack(c: RBXScriptConnection) {
	settingsConnections.push(c);
	return c;
}

function clearSettingsConnections() {
	for (const c of settingsConnections) c.Disconnect();
	settingsConnections.clear();
}

function clearMobileTools() {
	for (const c of mobileToolConnections) c.Disconnect();
	mobileToolConnections.clear();
	for (const tool of mobileTools) {
		if (tool.Parent) tool.Destroy();
	}
	mobileTools.clear();
}

function destroySettingsMenu() {
	clearSettingsConnections();
	if (settingsConn) settingsConn.Disconnect();
	settingsConn = undefined;
	settingsKeyListening = false;
	if (settingsGui) settingsGui.Destroy();
	settingsGui = undefined;
	settingsRoot = undefined;
	settingsGlow = undefined;
}

function configBool(key: keyof Config, fallback: boolean) {
	const v = config[key];
	return typeIs(v, "boolean") ? v : fallback;
}

function configString(key: keyof Config, fallback: string) {
	const v = config[key];
	return typeIs(v, "string") && v.size() > 0 ? v : fallback;
}

function configNumber(key: keyof Config, fallback: number) {
	const v = config[key];
	return typeIs(v, "number") ? v : fallback;
}

function setConfigValue(key: keyof Config, value: unknown) {
	const bag = config as unknown as { [key: string]: unknown };
	bag[key as string] = value;
	applyConfigSideEffects(key);
	saveConfigSoon();
}

function applyConfigSideEffects(key: keyof Config) {
	if (key === "method") {
		if ((config.method as unknown) !== "NaN" && (config.method as unknown) !== "skidfling") config.method = "NaN";
		method = config.method === "skidfling" ? "skidfling" : "NaN";
	}
	if (key === "manualFlingDuration") config.manualFlingDuration = math.clamp(configNumber("manualFlingDuration", 2), 0.25, 8);
	if (key === "theme") {
		config.theme = currentThemeName();
		updateWatermark();
		const restorePosition = settingsRoot?.Position;
		const restoreSize = settingsRoot?.Size;
		const restoreVisible = settingsRoot?.Visible ?? true;
		task.defer(() => {
			if (settingsGui?.Parent) {
				destroySettingsMenu();
				showSettingsMenu();
				if (settingsRoot) {
					if (restorePosition) settingsRoot.Position = restorePosition;
					if (restoreSize) settingsRoot.Size = restoreSize;
					settingsRoot.Visible = restoreVisible;
				}
				if (settingsGlow && settingsRoot) {
					settingsGlow.AnchorPoint = settingsRoot.AnchorPoint;
					settingsGlow.Position = settingsRoot.Position;
					settingsGlow.Size = UDim2.fromOffset(settingsRoot.AbsoluteSize.X + 26, settingsRoot.AbsoluteSize.Y + 26);
					settingsGlow.Visible = restoreVisible;
				}
			}
		});
	}
	if (key === "showGuide" && config.showGuide !== true) clearGuide();
	if (key === "showHRPs" && config.showHRPs !== true) clearHrpOutlines();
	if (key === "showWatermark") updateWatermark();
	if (key === "intro" && config.intro === false) killIntro();
	if (key === "antiFling" && config.antiFling !== true) restoreAntiFlingCollision();
	if (key === "repeatSameTarget") {
		for (const item of queue) {
			if (item.batch) continue;
			item.repeat = config.repeatSameTarget === true;
			if (item.repeat && !item.player) item.player = playerFromTarget(item.tgt);
		}
	}
	if (key === "platformMode" || key === "mobileFlingTool" || key === "mobileFlingAllTool" || key === "mobileCancelTool") {
		updateMobileTools();
	}
}

function baseInputName(input: InputObject) {
	if (input.KeyCode !== Enum.KeyCode.Unknown) return input.KeyCode.Name;
	return input.UserInputType.Name;
}

function isCtrlName(name: string) {
	return name === "LeftControl"
		|| name === "RightControl"
		|| name === "LeftMeta"
		|| name === "RightMeta"
		|| name === "LeftSuper"
		|| name === "RightSuper"
		|| name === "Ctrl";
}

function ctrlDownFor(input?: InputObject) {
	const base = input ? baseInputName(input) : "";
	if (base !== "" && isCtrlName(base)) return true;
	return inputService.IsKeyDown(Enum.KeyCode.LeftControl)
		|| inputService.IsKeyDown(Enum.KeyCode.RightControl)
		|| inputService.IsKeyDown(Enum.KeyCode.LeftMeta)
		|| inputService.IsKeyDown(Enum.KeyCode.RightMeta)
		|| inputService.IsKeyDown(Enum.KeyCode.LeftSuper)
		|| inputService.IsKeyDown(Enum.KeyCode.RightSuper);
}

function inputCombo(input: InputObject) {
	const base = baseInputName(input);
	if (isCtrlName(base)) return "Ctrl";
	return ctrlDownFor(input) ? `Ctrl+${base}` : base;
}

function bindMatches(input: InputObject, bind: string | undefined) {
	if (!bind || bind.size() === 0) return false;
	const parts = bind.split("+");
	let needCtrl = false;
	let base = "";
	for (const part of parts) {
		if (isCtrlName(part)) needCtrl = true;
		else base = part;
	}
	if (needCtrl && !ctrlDownFor(input)) return false;
	if (base === "") return isCtrlName(baseInputName(input));
	return baseInputName(input) === base;
}

function detectedPlatform() {
	if (inputService.TouchEnabled && !inputService.KeyboardEnabled) return "mobile";
	if (inputService.TouchEnabled && inputService.KeyboardEnabled) return "hybrid";
	return "pc";
}

function wantsMobileControls() {
	const mode = config.platformMode ?? "auto";
	if (mode === "mobile") return true;
	if (mode === "pc") return false;
	return inputService.TouchEnabled && !inputService.KeyboardEnabled;
}

function clampDragPosition(guiObject: GuiObject, position: UDim2) {
	cam = world.CurrentCamera;
	const viewport = cam?.ViewportSize ?? new Vector2(1920, 1080);
	const size = guiObject.AbsoluteSize;
	const anchor = guiObject.AnchorPoint;
	const raw = new Vector2(
		position.X.Scale * viewport.X + position.X.Offset,
		position.Y.Scale * viewport.Y + position.Y.Offset,
	);
	const minX = size.X * anchor.X + 8;
	const maxX = viewport.X - size.X * (1 - anchor.X) - 8;
	const minY = size.Y * anchor.Y + 8;
	const maxY = viewport.Y - size.Y * (1 - anchor.Y) - 8;
	return UDim2.fromOffset(
		maxX > minX ? math.clamp(raw.X, minX, maxX) : viewport.X * anchor.X,
		maxY > minY ? math.clamp(raw.Y, minY, maxY) : viewport.Y * anchor.Y,
	);
}

function dragify(guiObject: GuiObject, handle: GuiObject) {
	let startPosition: UDim2 | undefined;
	let dragStart = Vector3.zero;
	let dragging = false;
	let dragInput: InputObject | undefined;
	let activeTween: Tween | undefined;

	settingsTrack(handle.InputBegan.Connect((input) => {
		if (input.UserInputType !== Enum.UserInputType.MouseButton1 && input.UserInputType !== Enum.UserInputType.Touch) return;
		dragging = true;
		dragStart = input.Position;
		startPosition = guiObject.Position;
	}));

	settingsTrack(handle.InputChanged.Connect((input) => {
		if (input.UserInputType === Enum.UserInputType.MouseMovement || input.UserInputType === Enum.UserInputType.Touch) {
			dragInput = input;
		}
	}));

	settingsTrack(inputService.InputChanged.Connect((input) => {
		if (input !== dragInput || !dragging || !startPosition) return;
		const delta = input.Position.sub(dragStart);
		const nextPosition = clampDragPosition(guiObject, new UDim2(
			startPosition.X.Scale,
			startPosition.X.Offset + delta.X,
			startPosition.Y.Scale,
			startPosition.Y.Offset + delta.Y,
		));
		if (activeTween) activeTween.Cancel();
		activeTween = tweenService.Create(guiObject, new TweenInfo(0.16, Enum.EasingStyle.Circular, Enum.EasingDirection.Out), {
			Position: nextPosition,
		});
		activeTween.Play();
	}));

	settingsTrack(inputService.InputEnded.Connect((input) => {
		if (input === dragInput || input.UserInputType === Enum.UserInputType.MouseButton1 || input.UserInputType === Enum.UserInputType.Touch) {
			dragging = false;
		}
	}));
}

function killIntro() {
	if (introConn) introConn.Disconnect();
	if (introSound) {
		introSound.Volume = 0;
		introSound.Stop();
		introSound.Destroy();
	}
	if (introGui) introGui.Destroy();
	introConn = undefined;
	introSound = undefined;
	introGui = undefined;
	if (watermarkLabel?.Parent) {
		tweenService.Create(watermarkLabel, new TweenInfo(0.18), {
			TextTransparency: 0.08,
			TextStrokeTransparency: 0.38,
		}).Play();
	}
	if (watermarkStroke?.Parent) {
		tweenService.Create(watermarkStroke, new TweenInfo(0.18), { Transparency: 0.24 }).Play();
	}
}

function clearHrpOutlines() {
	for (const [, box] of hrpOutlines) {
		if (box.Parent) box.Destroy();
	}
	hrpOutlines.clear();
}

function clearWatermark() {
	if (watermarkConn) watermarkConn.Disconnect();
	if (watermarkGui) watermarkGui.Destroy();
	watermarkConn = undefined;
	watermarkGui = undefined;
	watermarkLabel = undefined;
	watermarkStroke = undefined;
}

function updateWatermark() {
	if (config.showWatermark !== true) {
		clearWatermark();
		return;
	}
	if (watermarkGui?.Parent) return;

	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "nbf9000Mark";
	screenGui.IgnoreGuiInset = true;
	screenGui.ResetOnSpawn = false;
	screenGui.DisplayOrder = 2147483646;
	screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling;
	screenGui.Parent = gethui();
	watermarkGui = screenGui;

	const label = new Instance("TextLabel");
	label.AnchorPoint = new Vector2(1, 1);
	label.Position = new UDim2(1, -12, 1, -10);
	label.Size = UDim2.fromOffset(180, 20);
	label.BackgroundTransparency = 1;
	label.BorderSizePixel = 0;
	label.Font = Enum.Font.Code;
	label.Text = "NBF9000";
	label.TextSize = 15;
	label.TextXAlignment = Enum.TextXAlignment.Right;
	label.TextYAlignment = Enum.TextYAlignment.Center;
	label.TextColor3 = currentTheme().text;
	label.TextTransparency = 0;
	label.TextStrokeColor3 = accentColor(0.72);
	label.TextStrokeTransparency = 0.35;
	label.ZIndex = 52;
	label.Parent = screenGui;
	watermarkLabel = label;

	const labelGrad = new Instance("UIGradient");
	labelGrad.Color = new ColorSequence([
		new ColorSequenceKeypoint(0, accentColor(0.72)),
		new ColorSequenceKeypoint(0.5, currentTheme().text),
		new ColorSequenceKeypoint(1, accentColor(0.2)),
	]);
	labelGrad.Parent = label;

	watermarkConn = runService.RenderStepped.Connect(() => {
		if (!label.Parent) {
			if (watermarkConn) watermarkConn.Disconnect();
			watermarkConn = undefined;
			return;
		}
		const t = os.clock();
		labelGrad.Offset = new Vector2(math.sin(t * 1.8) * 0.18, 0);
	});

}

function updateHrpOutlines() {
	if (config.showHRPs !== true) {
		clearHrpOutlines();
		return;
	}
	const live = new Set<Player>();
	for (const player of players.GetPlayers()) {
		if (player === localPlayer) continue;
		live.add(player);
		const [, root] = charParts(player.Character);
		let box = hrpOutlines.get(player);
		if (!root || !root.Parent) {
			if (box) {
				box.Destroy();
				hrpOutlines.delete(player);
			}
			continue;
		}
		if (!box || box.Adornee !== root || !box.Parent) {
			if (box) box.Destroy();
			box = new Instance("SelectionBox");
			box.Name = "HRP Mark";
			box.Adornee = root;
			box.LineThickness = 0.02;
			box.SurfaceTransparency = 1;
			box.Parent = root;
			hrpOutlines.set(player, box);
		}
		box.Color3 = accentColor(os.clock() * 0.55 + 0.26);
	}
	for (const [player, box] of hrpOutlines) {
		if (!live.has(player)) {
			box.Destroy();
			hrpOutlines.delete(player);
		}
	}
}

function makeIntroText(parent: Instance, s: string, size: number, y: number, high = false) {
	const label = new Instance("TextLabel");
	label.BackgroundTransparency = 1;
	label.AnchorPoint = new Vector2(0.5, 0.5);
	label.Position = new UDim2(0.5, 0, 0, y);
	label.Size = new UDim2(1, -28, 0, size + 10);
	label.Font = high ? Enum.Font.Arcade : Enum.Font.Code;
	label.Text = s;
	label.TextSize = size;
	label.TextColor3 = currentTheme().text;
	label.TextStrokeTransparency = high ? 0.25 : 0.55;
	label.TextXAlignment = Enum.TextXAlignment.Center;
	label.TextYAlignment = Enum.TextYAlignment.Center;
	label.ZIndex = 6;
	label.Parent = parent;
	return label;
}

function customAsset(path: string) { // this is really bad ngl, but it allows for a lot of flexibility in how the intro sound is provided, and it only checks for the file once so it's not too bad
	const [hasFile, fileOk] = pcall(() => isfile(path));
	if (hasFile && fileOk) {
		const [readOk, data] = pcall(() => readfile(path));
		if (readOk && typeIs(data, "string") && data.size() < 100000) return;
		const [ok, id] = pcall(() => getcustomasset(path));
		if (ok && typeIs(id, "string") && id.size() > 0) return id;
	}
}

function introAsset() {
	const path = "assets/nbf9000-intro.mp3";
	for (const p of [path]) {
		const asset = customAsset(p);
		if (asset) return asset;
	}

	pcall(() => {
		pcall(() => makefolder("assets"));
		const httpGet = (game as unknown as { [key: string]: (self: DataModel, url: string) => string })["HttpGet"];
		const data = httpGet(game, "https://raw.githubusercontent.com/xaviersupreme/nbf9000/main/assets/nbf9000-intro.mp3");
		if (data.size() > 100000) writefile(path, data);
	});

	const asset = customAsset(path);
	if (!asset) warn("nbf9000 intro sound missing: assets/nbf9000-intro.mp3 did not download or is not a valid mp3");
	return asset;
}

function showSettingsMenu(from?: GuiObject) {
	if (settingsGui?.Parent && settingsRoot && !from) {
		settingsRoot.Visible = true;
		if (settingsGlow) settingsGlow.Visible = true;
		return;
	}
	if (settingsGui?.Parent) destroySettingsMenu();
	const theme = currentTheme();

	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "nbf9000Settings";
	screenGui.IgnoreGuiInset = true;
	screenGui.ResetOnSpawn = false;
	screenGui.DisplayOrder = 2147483646;
	screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling;
	screenGui.Parent = gethui();
	settingsGui = screenGui;

	const fromSize = from?.AbsoluteSize;
	const fromPos = from?.AbsolutePosition;
	const startPosition = fromPos && fromSize
		? UDim2.fromOffset(fromPos.X + fromSize.X * 0.5, fromPos.Y + fromSize.Y * 0.5)
		: UDim2.fromScale(0.5, 0.5);
	const startSize = fromSize ? UDim2.fromOffset(fromSize.X, fromSize.Y) : new UDim2(0.92, 0, 0.78, 0);
	const fullSize = new UDim2(0.92, 0, 0.78, 0);

	const root = new Instance("Frame");
	root.AnchorPoint = new Vector2(0.5, 0.5);
	root.Position = startPosition;
	root.Size = startSize;
	root.BackgroundColor3 = theme.bg;
	root.BackgroundTransparency = 0.03;
	root.BorderSizePixel = 0;
	root.ClipsDescendants = true;
	root.Active = true;
	root.ZIndex = 2;
	root.Parent = screenGui;
	settingsRoot = root;

	const rootCorner = new Instance("UICorner");
	rootCorner.CornerRadius = new UDim(0, 7);
	rootCorner.Parent = root;

	const rootSize = new Instance("UISizeConstraint");
	rootSize.MinSize = from ? new Vector2(260, 36) : new Vector2(330, 304);
	rootSize.MaxSize = new Vector2(440, 382);
	rootSize.Parent = root;

	const rootScale = new Instance("UIScale");
	rootScale.Scale = from ? 1 : 0.96;
	rootScale.Parent = root;

	const rootStroke = new Instance("UIStroke");
	rootStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
	rootStroke.Color = new Color3(1, 1, 1);
	rootStroke.Thickness = 1.25;
	rootStroke.Transparency = 0;
	rootStroke.Parent = root;
	accentGradient(rootStroke);

	const glow = new Instance("Frame");
	glow.AnchorPoint = root.AnchorPoint;
	glow.Position = root.Position;
	glow.Size = UDim2.fromOffset((fromSize?.X ?? 440) + 26, (fromSize?.Y ?? 382) + 26);
	glow.BackgroundColor3 = accentColor(0);
	glow.BackgroundTransparency = 1;
	glow.BorderSizePixel = 0;
	glow.ZIndex = 1;
	glow.Parent = screenGui;
	settingsGlow = glow;

	const glowCorner = new Instance("UICorner");
	glowCorner.CornerRadius = new UDim(0, 12);
	glowCorner.Parent = glow;

	const glowStroke = new Instance("UIStroke");
	glowStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
	glowStroke.Color = new Color3(1, 1, 1);
	glowStroke.Thickness = 5;
	glowStroke.Transparency = 0.6;
	glowStroke.Parent = glow;
	const glowGrad = accentGradient(glowStroke);

	const top = new Instance("Frame");
	top.Size = new UDim2(1, 0, 0, 36);
	top.BackgroundColor3 = theme.top;
	top.BorderSizePixel = 0;
	top.ZIndex = 4;
	top.Parent = root;

	const topCorner = new Instance("UICorner");
	topCorner.CornerRadius = new UDim(0, 7);
	topCorner.Parent = top;

	const topFill = new Instance("Frame");
	topFill.Position = new UDim2(0, 0, 1, -7);
	topFill.Size = new UDim2(1, 0, 0, 7);
	topFill.BackgroundColor3 = top.BackgroundColor3;
	topFill.BorderSizePixel = 0;
	topFill.ZIndex = 4;
	topFill.Parent = top;

	const title = new Instance("TextLabel");
	title.Position = UDim2.fromOffset(12, 0);
	title.Size = UDim2.fromOffset(176, 36);
	title.BackgroundTransparency = 1;
	title.Font = Enum.Font.Code;
	title.Text = "NBF9000 // settings";
	title.TextColor3 = theme.text;
	title.TextSize = 18;
	title.TextXAlignment = Enum.TextXAlignment.Left;
	title.TextYAlignment = Enum.TextYAlignment.Center;
	title.TextStrokeTransparency = 0.6;
	title.TextTruncate = Enum.TextTruncate.AtEnd;
	title.ZIndex = 5;
	title.Parent = top;
	const titleGrad = accentGradient(title);

	const mini = new Instance("TextButton");
	mini.AnchorPoint = new Vector2(1, 0);
	mini.Position = new UDim2(1, 0, 0, 0);
	mini.Size = UDim2.fromOffset(38, 36);
	mini.BackgroundTransparency = 1;
	mini.Text = "";
	mini.AutoButtonColor = false;
	mini.ZIndex = 7;
	mini.Parent = top;

	const miniBar = new Instance("Frame");
	miniBar.AnchorPoint = new Vector2(0.5, 0.5);
	miniBar.Position = UDim2.fromScale(0.5, 0.5);
	miniBar.Size = UDim2.fromOffset(16, 2);
	miniBar.BackgroundColor3 = theme.text;
	miniBar.BorderSizePixel = 0;
	miniBar.ZIndex = 8;
	miniBar.Parent = mini;

	const mathStrip = new Instance("Frame");
	mathStrip.Position = UDim2.fromOffset(184, 9);
	mathStrip.Size = new UDim2(1, -226, 0, 18);
	mathStrip.BackgroundTransparency = 1;
	mathStrip.ClipsDescendants = true;
	mathStrip.ZIndex = 6;
	mathStrip.Parent = top;

	const mathNodes = new Array<Frame>();
	const mathLines = new Array<Frame>();
	for (let i = 0; i < 24; i++) {
		const dot = new Instance("Frame");
		dot.AnchorPoint = new Vector2(0.5, 0.5);
		dot.Position = UDim2.fromScale(0.5, 0.5);
		dot.Size = UDim2.fromOffset(3, 3);
		dot.BackgroundColor3 = accentColor(i / 24);
		dot.BackgroundTransparency = 0.12;
		dot.BorderSizePixel = 0;
		dot.ZIndex = 8;
		dot.Parent = mathStrip;
		const dotCorner = new Instance("UICorner");
		dotCorner.CornerRadius = new UDim(0, 2);
		dotCorner.Parent = dot;
		mathNodes.push(dot);
		if (i > 0) {
			const line = new Instance("Frame");
			line.AnchorPoint = new Vector2(0.5, 0.5);
			line.Position = UDim2.fromScale(0.5, 0.5);
			line.Size = UDim2.fromOffset(8, 1);
			line.BackgroundColor3 = accentColor(i / 24);
			line.BackgroundTransparency = 0.46;
			line.BorderSizePixel = 0;
			line.ZIndex = 7;
			line.Parent = mathStrip;
			mathLines.push(line);
		}
	}

	const content = new Instance("Frame");
	content.Position = UDim2.fromOffset(12, 44);
	content.Size = new UDim2(1, -24, 1, -58);
	content.BackgroundTransparency = 1;
	content.ClipsDescendants = true;
	content.ZIndex = 4;
	content.Visible = from === undefined;
	content.Parent = root;

	const scanlines = new Array<Frame>();
	for (let i = 0; i < 11; i++) {
		const line = new Instance("Frame");
		line.Position = new UDim2(0, 0, 0, 40 + i * 22);
		line.Size = new UDim2(1, 0, 0, 1);
		line.BackgroundColor3 = new Color3(1, 1, 1);
		line.BackgroundTransparency = 0.955;
		line.BorderSizePixel = 0;
		line.ZIndex = 3;
		line.Visible = from === undefined;
		line.Parent = root;
		scanlines.push(line);
	}

	const page = new Instance("ScrollingFrame");
	page.Size = UDim2.fromScale(1, 1);
	page.BackgroundTransparency = 1;
	page.BorderSizePixel = 0;
	page.CanvasSize = new UDim2();
	page.AutomaticCanvasSize = Enum.AutomaticSize.Y;
	page.ScrollBarThickness = 3;
	page.ScrollBarImageColor3 = theme.scroll;
	page.ScrollBarImageTransparency = 0.18;
	page.ScrollingDirection = Enum.ScrollingDirection.Y;
	page.ZIndex = 5;
	page.Parent = content;

	const pagePadding = new Instance("UIPadding");
	pagePadding.PaddingTop = new UDim(0, 0);
	pagePadding.PaddingBottom = new UDim(0, 8);
	pagePadding.PaddingLeft = new UDim(0, 2);
	pagePadding.PaddingRight = new UDim(0, 8);
	pagePadding.Parent = page;

	const pageLayout = new Instance("UIListLayout");
	pageLayout.FillDirection = Enum.FillDirection.Vertical;
	pageLayout.Padding = new UDim(0, 8);
	pageLayout.SortOrder = Enum.SortOrder.LayoutOrder;
	pageLayout.Parent = page;

	function stylizeBox(obj: GuiObject, depth = false) {
		const corner = new Instance("UICorner");
		corner.CornerRadius = new UDim(0, 7);
		corner.Parent = obj;
		const stroke = new Instance("UIStroke");
		stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
		stroke.Color = new Color3(1, 1, 1);
		stroke.Thickness = 1;
		stroke.Transparency = 0.2;
		stroke.Parent = obj;
		accentGradient(stroke);
		obj.BackgroundColor3 = depth ? theme.depth : theme.surface;
		return stroke;
	}

	function section(text: string) {
		const frame = new Instance("Frame");
		frame.Size = new UDim2(1, 0, 0, 28);
		frame.BackgroundTransparency = 1;
		frame.ZIndex = 5;
		frame.Parent = page;

		const label = new Instance("TextLabel");
		label.Position = UDim2.fromOffset(0, 0);
		label.Size = UDim2.fromOffset(120, 28);
		label.BackgroundTransparency = 1;
		label.Font = Enum.Font.Code;
		label.Text = text.upper();
		label.TextColor3 = theme.muted;
		label.TextSize = 13;
		label.TextXAlignment = Enum.TextXAlignment.Left;
		label.TextYAlignment = Enum.TextYAlignment.Center;
		label.TextTransparency = 0.04;
		label.ZIndex = 6;
		label.Parent = frame;
		accentGradient(label);

		const line = new Instance("Frame");
		line.AnchorPoint = new Vector2(1, 0.5);
		line.Position = new UDim2(1, 0, 0.5, 0);
		line.Size = new UDim2(1, -130, 0, 1);
		line.BackgroundColor3 = new Color3(1, 1, 1);
		line.BackgroundTransparency = 0.72;
		line.BorderSizePixel = 0;
		line.ZIndex = 6;
		line.Parent = frame;
		accentGradient(line);
	}

	function row(height: number) {
		const frame = new Instance("Frame");
		frame.Size = new UDim2(1, 0, 0, height);
		frame.BackgroundTransparency = 0.14;
		frame.BorderSizePixel = 0;
		frame.ClipsDescendants = false;
		frame.ZIndex = 5;
		frame.Parent = page;
		stylizeBox(frame, true);
		return frame;
	}

	function makeToggle(text: string, key: keyof Config, fallback: boolean, onChanged?: (on: boolean) => void) {
		const item = row(42);
		const caption = new Instance("TextLabel");
		caption.Position = UDim2.fromOffset(10, 0);
		caption.Size = new UDim2(1, -64, 1, 0);
		caption.BackgroundTransparency = 1;
		caption.Font = Enum.Font.Code;
		caption.Text = text;
		caption.TextColor3 = theme.text;
		caption.TextSize = 15;
		caption.TextXAlignment = Enum.TextXAlignment.Left;
		caption.TextYAlignment = Enum.TextYAlignment.Center;
		caption.TextWrapped = true;
		caption.ZIndex = 6;
		caption.Parent = item;

		const button = new Instance("TextButton");
		button.AnchorPoint = new Vector2(1, 0.5);
		button.Position = new UDim2(1, -10, 0.5, 0);
		button.Size = UDim2.fromOffset(42, 24);
		button.BackgroundTransparency = 0;
		button.BorderSizePixel = 0;
		button.Text = "";
		button.AutoButtonColor = false;
		button.ZIndex = 7;
		button.Parent = item;
		stylizeBox(button);

		const fill = new Instance("Frame");
		fill.Size = UDim2.fromScale(1, 1);
		fill.BackgroundColor3 = accentColor(0);
		fill.BackgroundTransparency = 1;
		fill.BorderSizePixel = 0;
		fill.ZIndex = 7;
		fill.Parent = button;
		const fillCorner = new Instance("UICorner");
		fillCorner.CornerRadius = new UDim(0, 7);
		fillCorner.Parent = fill;

		const knob = new Instance("Frame");
		knob.AnchorPoint = new Vector2(0.5, 0.5);
		knob.Position = new UDim2(0, 12, 0.5, 0);
		knob.Size = UDim2.fromOffset(14, 14);
		knob.BackgroundColor3 = theme.text;
		knob.BackgroundTransparency = 0.1;
		knob.BorderSizePixel = 0;
		knob.ZIndex = 8;
		knob.Parent = button;
		const knobCorner = new Instance("UICorner");
		knobCorner.CornerRadius = new UDim(0, 5);
		knobCorner.Parent = knob;

		function update(animated = true) {
			const on = configBool(key, fallback);
			const info = new TweenInfo(animated ? 0.18 : 0, Enum.EasingStyle.Cubic, Enum.EasingDirection.Out);
			tweenService.Create(fill, info, { BackgroundTransparency: on ? 0.2 : 1 }).Play();
			tweenService.Create(knob, info, {
				Position: new UDim2(on ? 1 : 0, on ? -12 : 12, 0.5, 0),
			}).Play();
			caption.TextTransparency = on ? 0 : 0.16;
		}

		settingsTrack(button.MouseEnter.Connect(() => tweenService.Create(button, new TweenInfo(0.14), { BackgroundTransparency: 0.08 }).Play()));
		settingsTrack(button.MouseLeave.Connect(() => tweenService.Create(button, new TweenInfo(0.18), { BackgroundTransparency: 0 }).Play()));
		settingsTrack(button.Activated.Connect(() => {
			setConfigValue(key, !configBool(key, fallback));
			update();
			onChanged?.(configBool(key, fallback));
		}));
		update(false);
	}

	function makeInfo(text: string, value: string) {
		const item = row(34);
		const caption = new Instance("TextLabel");
		caption.Position = UDim2.fromOffset(10, 0);
		caption.Size = new UDim2(1, -150, 1, 0);
		caption.BackgroundTransparency = 1;
		caption.Font = Enum.Font.Code;
		caption.Text = text;
		caption.TextColor3 = theme.text;
		caption.TextSize = 14;
		caption.TextXAlignment = Enum.TextXAlignment.Left;
		caption.TextYAlignment = Enum.TextYAlignment.Center;
		caption.ZIndex = 6;
		caption.Parent = item;

		const val = new Instance("TextLabel");
		val.AnchorPoint = new Vector2(1, 0.5);
		val.Position = new UDim2(1, -10, 0.5, 0);
		val.Size = UDim2.fromOffset(132, 24);
		val.BackgroundTransparency = 1;
		val.Font = Enum.Font.Code;
		val.Text = value;
		val.TextColor3 = theme.muted;
		val.TextSize = 13;
		val.TextXAlignment = Enum.TextXAlignment.Center;
		val.TextYAlignment = Enum.TextYAlignment.Center;
		val.ZIndex = 6;
		val.Parent = item;
	}

	function makeSlider(text: string, key: keyof Config, fallback: number, min: number, max: number, step: number, unit = "") {
		const height = 64;
		const margin = 10;
		const item = row(height);
		item.ClipsDescendants = true;

		const caption = new Instance("TextLabel");
		caption.Position = UDim2.fromOffset(margin, 4);
		caption.Size = new UDim2(1, -112, 0, 28);
		caption.BackgroundTransparency = 1;
		caption.Font = Enum.Font.Code;
		caption.Text = text;
		caption.TextColor3 = theme.text;
		caption.TextSize = 15;
		caption.TextXAlignment = Enum.TextXAlignment.Left;
		caption.TextYAlignment = Enum.TextYAlignment.Center;
		caption.TextWrapped = true;
		caption.ZIndex = 6;
		caption.Parent = item;

		const box = new Instance("Frame");
		box.AnchorPoint = new Vector2(1, 0);
		box.Position = new UDim2(1, -margin, 0, 7);
		box.Size = UDim2.fromOffset(82, 24);
		box.BackgroundTransparency = 0;
		box.BorderSizePixel = 0;
		box.ZIndex = 7;
		box.Parent = item;
		stylizeBox(box);

		const valueBox = new Instance("TextBox");
		valueBox.Size = UDim2.fromScale(1, 1);
		valueBox.BackgroundTransparency = 1;
		valueBox.ClearTextOnFocus = false;
		valueBox.Font = Enum.Font.Code;
		valueBox.TextColor3 = theme.text;
		valueBox.PlaceholderColor3 = theme.soft;
		valueBox.TextSize = 13;
		valueBox.TextXAlignment = Enum.TextXAlignment.Center;
		valueBox.TextYAlignment = Enum.TextYAlignment.Center;
		valueBox.ZIndex = 8;
		valueBox.Parent = box;

		const bar = new Instance("TextButton");
		bar.Position = UDim2.fromOffset(0, 36);
		bar.Size = new UDim2(1, 0, 0, 24);
		bar.BackgroundTransparency = 1;
		bar.BorderSizePixel = 0;
		bar.Text = "";
		bar.AutoButtonColor = true;
		bar.ZIndex = 7;
		bar.Parent = item;

		const rail = new Instance("Frame");
		rail.AnchorPoint = new Vector2(0.5, 0.5);
		rail.Position = new UDim2(0.5, 0, 0.5, 0);
		rail.Size = new UDim2(1, -38, 0, 5);
		rail.BackgroundColor3 = theme.surface;
		rail.BackgroundTransparency = 0;
		rail.BorderSizePixel = 0;
		rail.ZIndex = 7;
		rail.Parent = bar;
		stylizeBox(rail, true);

		const fill = new Instance("Frame");
		fill.Size = UDim2.fromScale(0, 1);
		fill.BackgroundColor3 = accentColor(0);
		fill.BackgroundTransparency = 0.18;
		fill.BorderSizePixel = 0;
		fill.ZIndex = 8;
		fill.Parent = rail;
		const fillCorner = new Instance("UICorner");
		fillCorner.CornerRadius = new UDim(0, 7);
		fillCorner.Parent = fill;
		accentGradient(fill);

		const knob = new Instance("Frame");
		knob.AnchorPoint = new Vector2(0.5, 0.5);
		knob.Position = new UDim2(0, 0, 0.5, 0);
		knob.Size = UDim2.fromOffset(18, 18);
		knob.BackgroundColor3 = theme.text;
		knob.BackgroundTransparency = 0;
		knob.BorderSizePixel = 0;
		knob.ZIndex = 9;
		knob.Parent = rail;
		const knobCorner = new Instance("UICorner");
		knobCorner.CornerRadius = new UDim(1, 0);
		knobCorner.Parent = knob;
		const knobStroke = new Instance("UIStroke");
		knobStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
		knobStroke.Color = new Color3(1, 1, 1);
		knobStroke.Thickness = 1;
		knobStroke.Transparency = 0.28;
		knobStroke.Parent = knob;
		accentGradient(knobStroke);

		const range = max - min;
		if (step > 0 && range / step <= 20) {
			let i = min + step;
			while (i < max) {
				const tick = new Instance("Frame");
				tick.AnchorPoint = new Vector2(0.5, 0);
				tick.Position = new UDim2((i - min) / range, 0, 1, 2);
				tick.Size = UDim2.fromOffset(1, 4);
				tick.BackgroundColor3 = theme.text;
				tick.BackgroundTransparency = 0.55;
				tick.BorderSizePixel = 0;
				tick.ZIndex = 8;
				tick.Parent = rail;
				i += step;
			}
		}

		function snap(v: number) {
			return math.clamp(min + math.floor((v - min) / step + 0.5) * step, min, max);
		}

		function current() {
			return snap(configNumber(key, fallback));
		}

		function updateVisual(animated = true) {
			const value = current();
			const alpha = math.clamp((value - min) / (max - min), 0, 1);
			const rounded = math.floor(value * 100 + 0.5) / 100;
			valueBox.Text = `${rounded}${unit}`;
			const info = new TweenInfo(animated ? 0.12 : 0, Enum.EasingStyle.Cubic, Enum.EasingDirection.Out);
			tweenService.Create(fill, info, { Size: new UDim2(alpha, 0, 1, 0) }).Play();
			tweenService.Create(knob, info, { Position: new UDim2(alpha, 0, 0.5, 0) }).Play();
		}

		function setFromX(x: number) {
			const alpha = math.clamp((x - rail.AbsolutePosition.X) / math.max(1, rail.AbsoluteSize.X), 0, 1);
			const value = snap(min + (max - min) * alpha);
			setConfigValue(key, value);
			updateVisual(false);
		}

		let dragging = false;
		settingsTrack(bar.InputBegan.Connect((input) => {
			if (input.UserInputType !== Enum.UserInputType.MouseButton1 && input.UserInputType !== Enum.UserInputType.Touch) return;
			dragging = true;
			setFromX(input.Position.X);
		}));
		settingsTrack(inputService.InputChanged.Connect((input) => {
			if (!dragging) return;
			if (input.UserInputType !== Enum.UserInputType.MouseMovement && input.UserInputType !== Enum.UserInputType.Touch) return;
			setFromX(input.Position.X);
		}));
		settingsTrack(inputService.InputEnded.Connect((input) => {
			if (input.UserInputType === Enum.UserInputType.MouseButton1 || input.UserInputType === Enum.UserInputType.Touch) dragging = false;
		}));
		settingsTrack(valueBox.Focused.Connect(() => {
			valueBox.Text = `${current()}`;
		}));
		settingsTrack(valueBox.FocusLost.Connect(() => {
			const clean = valueBox.Text.gsub(unit, "")[0];
			const parsed = tonumber(clean);
			if (parsed !== undefined) setConfigValue(key, snap(parsed));
			updateVisual(false);
		}));

		updateVisual(false);

		function setVisible(visible: boolean, animated = true) {
			if (visible) item.Visible = true;
			const info = new TweenInfo(animated ? 0.2 : 0, Enum.EasingStyle.Cubic, visible ? Enum.EasingDirection.Out : Enum.EasingDirection.In);
			tweenService.Create(item, info, {
				Size: new UDim2(1, 0, 0, visible ? height : 0),
				BackgroundTransparency: visible ? 0.14 : 1,
			}).Play();
			if (!visible) task.delay(animated ? 0.2 : 0, () => {
				if (item.Size.Y.Offset <= 1) item.Visible = false;
			});
		}

		return { setVisible };
	}

	let creditsOverlay: Frame | undefined;

	function closeCredits(animated = true) {
		const overlay = creditsOverlay;
		creditsOverlay = undefined;
		if (!overlay?.Parent) return;
		if (!animated) {
			overlay.Destroy();
			return;
		}
		tweenService.Create(overlay, new TweenInfo(0.14, Enum.EasingStyle.Cubic, Enum.EasingDirection.In), {
			BackgroundTransparency: 1,
		}).Play();
		task.delay(0.15, () => {
			if (overlay.Parent) overlay.Destroy();
		});
	}

	function showCredits() {
		closeCredits(false);
		const overlay = new Instance("Frame");
		creditsOverlay = overlay;
		overlay.Position = UDim2.fromOffset(12, 44);
		overlay.Size = new UDim2(1, -24, 1, -58);
		overlay.BackgroundColor3 = theme.surface;
		overlay.BackgroundTransparency = 1;
		overlay.BorderSizePixel = 0;
		overlay.ZIndex = 30;
		overlay.Parent = root;
		stylizeBox(overlay, true);

		const title = new Instance("TextLabel");
		title.Position = UDim2.fromOffset(14, 10);
		title.Size = new UDim2(1, -56, 0, 24);
		title.BackgroundTransparency = 1;
		title.Font = Enum.Font.Code;
		title.Text = "credits";
		title.TextColor3 = theme.text;
		title.TextSize = 18;
		title.TextXAlignment = Enum.TextXAlignment.Left;
		title.TextYAlignment = Enum.TextYAlignment.Center;
		title.ZIndex = 32;
		title.Parent = overlay;
		accentGradient(title);

		const close = new Instance("TextButton");
		close.AnchorPoint = new Vector2(1, 0);
		close.Position = new UDim2(1, -10, 0, 8);
		close.Size = UDim2.fromOffset(34, 26);
		close.BackgroundColor3 = theme.surface;
		close.BorderSizePixel = 0;
		close.Font = Enum.Font.Code;
		close.Text = "<";
		close.TextColor3 = theme.text;
		close.TextSize = 16;
		close.AutoButtonColor = false;
		close.ZIndex = 33;
		close.Parent = overlay;
		stylizeBox(close);

		const lines = [
			["kobold (@koboldpaws on discord)", "NBF9000 direction, testing, and script concept"],
			["wlwaw / zzz (@wlwaw on discord)", "mobile script testing"],
			["STEVE-916-create / Uhhhhhh", "theme references and broad UI inspiration"],
			["AnthonyIsntHere", "original SkidFling method/reference"],
		];
		for (let i = 0; i < lines.size(); i++) {
			const name = new Instance("TextLabel");
			name.Position = UDim2.fromOffset(16, 50 + i * 54);
			name.Size = new UDim2(1, -32, 0, 20);
			name.BackgroundTransparency = 1;
			name.Font = Enum.Font.Code;
			name.Text = lines[i][0];
			name.TextColor3 = theme.text;
			name.TextSize = 15;
			name.TextXAlignment = Enum.TextXAlignment.Left;
			name.TextYAlignment = Enum.TextYAlignment.Center;
			name.ZIndex = 32;
			name.Parent = overlay;

			const detail = new Instance("TextLabel");
			detail.Position = UDim2.fromOffset(16, 72 + i * 54);
			detail.Size = new UDim2(1, -32, 0, 18);
			detail.BackgroundTransparency = 1;
			detail.Font = Enum.Font.Code;
			detail.Text = lines[i][1];
			detail.TextColor3 = theme.muted;
			detail.TextSize = 12;
			detail.TextXAlignment = Enum.TextXAlignment.Left;
			detail.TextYAlignment = Enum.TextYAlignment.Center;
			detail.TextWrapped = true;
			detail.ZIndex = 32;
			detail.Parent = overlay;
		}

		tweenService.Create(overlay, new TweenInfo(0.18, Enum.EasingStyle.Cubic, Enum.EasingDirection.Out), {
			BackgroundTransparency: 0.04,
		}).Play();
		settingsTrack(close.Activated.Connect(() => closeCredits(true)));
	}

	function makeActionButton(text: string, onActivated: () => void) {
		const item = row(42);
		const button = new Instance("TextButton");
		button.Position = UDim2.fromOffset(8, 7);
		button.Size = new UDim2(1, -16, 0, 28);
		button.BackgroundTransparency = 0;
		button.BorderSizePixel = 0;
		button.Font = Enum.Font.Code;
		button.Text = text;
		button.TextColor3 = theme.text;
		button.TextSize = 14;
		button.AutoButtonColor = false;
		button.ZIndex = 7;
		button.Parent = item;
		stylizeBox(button);
		settingsTrack(button.MouseEnter.Connect(() => tweenService.Create(button, new TweenInfo(0.14), { BackgroundTransparency: 0.08 }).Play()));
		settingsTrack(button.MouseLeave.Connect(() => tweenService.Create(button, new TweenInfo(0.18), { BackgroundTransparency: 0 }).Play()));
		settingsTrack(button.Activated.Connect(onActivated));
	}

	let openDropdown: Frame | undefined;
	let closeOpenDropdown: (() => void) | undefined;

	function makeDropdown(text: string, key: keyof Config, values: Array<string>, fallback: string) {
		const closedHeight = 42;
		const optionHeight = 24;
		const dropdownClosedHeight = 26;
		const dropdownWidth = 132;
		const dropdownOpenHeight = dropdownClosedHeight + values.size() * optionHeight + 8;
		const openHeight = 8 + dropdownOpenHeight + 6;

		const item = new Instance("Frame");
		item.Size = new UDim2(1, 0, 0, closedHeight);
		item.BackgroundTransparency = 1;
		item.BorderSizePixel = 0;
		item.ClipsDescendants = false;
		item.ZIndex = 5;
		item.Parent = page;

		const card = new Instance("Frame");
		card.Size = new UDim2(1, 0, 0, closedHeight);
		card.BackgroundTransparency = 0.14;
		card.BorderSizePixel = 0;
		card.ZIndex = 5;
		card.Parent = item;
		stylizeBox(card, true);

		const caption = new Instance("TextLabel");
		caption.Position = UDim2.fromOffset(10, 0);
		caption.Size = new UDim2(1, -dropdownWidth - 26, 0, closedHeight);
		caption.BackgroundTransparency = 1;
		caption.Font = Enum.Font.Code;
		caption.Text = text;
		caption.TextColor3 = theme.text;
		caption.TextSize = 15;
		caption.TextXAlignment = Enum.TextXAlignment.Left;
		caption.TextYAlignment = Enum.TextYAlignment.Center;
		caption.ZIndex = 6;
		caption.Parent = card;

		const dropdown = new Instance("Frame");
		dropdown.AnchorPoint = new Vector2(1, 0);
		dropdown.Position = new UDim2(1, -10, 0, 8);
		dropdown.Size = UDim2.fromOffset(dropdownWidth, dropdownClosedHeight);
		dropdown.BackgroundTransparency = 0;
		dropdown.BorderSizePixel = 0;
		dropdown.ClipsDescendants = true;
		dropdown.ZIndex = 8;
		dropdown.Parent = item;
		stylizeBox(dropdown);

		const button = new Instance("TextButton");
		button.Size = new UDim2(1, -18, 0, dropdownClosedHeight);
		button.BackgroundTransparency = 1;
		button.BorderSizePixel = 0;
		button.Font = Enum.Font.Code;
		button.TextColor3 = theme.text;
		button.TextSize = 13;
		button.Text = configString(key, fallback);
		button.TextXAlignment = Enum.TextXAlignment.Center;
		button.AutoButtonColor = false;
		button.ZIndex = 9;
		button.Parent = dropdown;

		const arrow = new Instance("TextLabel");
		arrow.AnchorPoint = new Vector2(1, 0);
		arrow.Position = new UDim2(1, -4, 0, 0);
		arrow.Size = UDim2.fromOffset(16, dropdownClosedHeight);
		arrow.BackgroundTransparency = 1;
		arrow.Font = Enum.Font.Code;
		arrow.Text = "v";
		arrow.TextColor3 = theme.muted;
		arrow.TextSize = 12;
		arrow.TextXAlignment = Enum.TextXAlignment.Center;
		arrow.TextYAlignment = Enum.TextYAlignment.Center;
		arrow.ZIndex = 10;
		arrow.Parent = dropdown;

		const separator = new Instance("Frame");
		separator.Position = new UDim2(0, 7, 0, dropdownClosedHeight);
		separator.Size = new UDim2(1, -14, 0, 1);
		separator.BackgroundColor3 = new Color3(1, 1, 1);
		separator.BackgroundTransparency = 1;
		separator.BorderSizePixel = 0;
		separator.ZIndex = 10;
		separator.Parent = dropdown;
		accentGradient(separator);

		const optionBox = new Instance("Frame");
		optionBox.Position = UDim2.fromOffset(0, dropdownClosedHeight);
		optionBox.Size = new UDim2(1, 0, 0, values.size() * optionHeight + 8);
		optionBox.BackgroundTransparency = 1;
		optionBox.BorderSizePixel = 0;
		optionBox.ZIndex = 10;
		optionBox.Parent = dropdown;

		const optionPadding = new Instance("UIPadding");
		optionPadding.PaddingTop = new UDim(0, 3);
		optionPadding.PaddingBottom = new UDim(0, 4);
		optionPadding.PaddingLeft = new UDim(0, 5);
		optionPadding.PaddingRight = new UDim(0, 5);
		optionPadding.Parent = optionBox;

		const optionLayout = new Instance("UIListLayout");
		optionLayout.FillDirection = Enum.FillDirection.Vertical;
		optionLayout.SortOrder = Enum.SortOrder.LayoutOrder;
		optionLayout.Parent = optionBox;

		const options = new Array<TextButton>();
		for (let i = 0; i < values.size(); i++) {
			const value = values[i];
			const option = new Instance("TextButton");
			option.Size = new UDim2(1, 0, 0, optionHeight);
			option.BackgroundColor3 = theme.depth;
			option.BackgroundTransparency = 1;
			option.BorderSizePixel = 0;
			option.Font = Enum.Font.Code;
			option.Text = value;
			option.TextColor3 = theme.text;
			option.TextSize = 13;
			option.TextXAlignment = Enum.TextXAlignment.Center;
			option.Visible = false;
			option.ZIndex = 11;
			option.LayoutOrder = i;
			option.AutoButtonColor = false;
			option.Parent = optionBox;
			const optionCorner = new Instance("UICorner");
			optionCorner.CornerRadius = new UDim(0, 5);
			optionCorner.Parent = option;
			options.push(option);
			settingsTrack(option.MouseEnter.Connect(() => tweenService.Create(option, new TweenInfo(0.12), { BackgroundTransparency: 0.12 }).Play()));
			settingsTrack(option.MouseLeave.Connect(() => tweenService.Create(option, new TweenInfo(0.14), { BackgroundTransparency: 1 }).Play()));
			settingsTrack(option.Activated.Connect(() => {
				setConfigValue(key, value);
				button.Text = value;
				if (closeOpenDropdown) closeOpenDropdown();
			}));
		}

		let itemTween: Tween | undefined;
		let dropdownTween: Tween | undefined;
		let listOpen = false;

		function closeList() {
			if (itemTween) itemTween.Cancel();
			if (dropdownTween) dropdownTween.Cancel();
			listOpen = false;
			if (openDropdown === item) {
				openDropdown = undefined;
				closeOpenDropdown = undefined;
			}
			for (const option of options) option.Visible = false;
			itemTween = tweenService.Create(item, new TweenInfo(0.18, Enum.EasingStyle.Cubic, Enum.EasingDirection.InOut), {
				Size: new UDim2(1, 0, 0, closedHeight),
			});
			dropdownTween = tweenService.Create(dropdown, new TweenInfo(0.16, Enum.EasingStyle.Cubic, Enum.EasingDirection.In), {
				Size: UDim2.fromOffset(dropdownWidth, dropdownClosedHeight),
				BackgroundTransparency: 0,
			});
			tweenService.Create(separator, new TweenInfo(0.12), { BackgroundTransparency: 1 }).Play();
			tweenService.Create(arrow, new TweenInfo(0.16, Enum.EasingStyle.Cubic, Enum.EasingDirection.Out), { Rotation: 0 }).Play();
			itemTween.Play();
			dropdownTween.Play();
		}

		function openList() {
			if (openDropdown && openDropdown !== item && closeOpenDropdown) closeOpenDropdown();
			if (itemTween) itemTween.Cancel();
			if (dropdownTween) dropdownTween.Cancel();
			listOpen = true;
			openDropdown = item;
			closeOpenDropdown = closeList;
			for (const option of options) option.Visible = true;
			itemTween = tweenService.Create(item, new TweenInfo(0.22, Enum.EasingStyle.Cubic, Enum.EasingDirection.Out), {
				Size: new UDim2(1, 0, 0, openHeight),
			});
			dropdownTween = tweenService.Create(dropdown, new TweenInfo(0.22, Enum.EasingStyle.Cubic, Enum.EasingDirection.Out), {
				Size: UDim2.fromOffset(dropdownWidth, dropdownOpenHeight),
				BackgroundTransparency: 0,
			});
			tweenService.Create(separator, new TweenInfo(0.18), { BackgroundTransparency: 0.72 }).Play();
			tweenService.Create(arrow, new TweenInfo(0.2, Enum.EasingStyle.Cubic, Enum.EasingDirection.Out), { Rotation: 180 }).Play();
			itemTween.Play();
			dropdownTween.Play();
		}

		settingsTrack(dropdown.MouseEnter.Connect(() => tweenService.Create(dropdown, new TweenInfo(0.14), { BackgroundTransparency: 0.08 }).Play()));
		settingsTrack(dropdown.MouseLeave.Connect(() => tweenService.Create(dropdown, new TweenInfo(0.18), { BackgroundTransparency: 0 }).Play()));
		settingsTrack(button.Activated.Connect(() => {
			if (listOpen) closeList();
			else openList();
		}));
	}

	function makeKeybind(text: string, key: keyof Config, fallback: string) {
		const item = row(42);
		const caption = new Instance("TextLabel");
		caption.Position = UDim2.fromOffset(10, 0);
		caption.Size = new UDim2(1, -150, 1, 0);
		caption.BackgroundTransparency = 1;
		caption.Font = Enum.Font.Code;
		caption.Text = text;
		caption.TextColor3 = theme.text;
		caption.TextSize = 15;
		caption.TextXAlignment = Enum.TextXAlignment.Left;
		caption.TextYAlignment = Enum.TextYAlignment.Center;
		caption.TextWrapped = true;
		caption.ZIndex = 6;
		caption.Parent = item;

		const button = new Instance("TextButton");
		button.AnchorPoint = new Vector2(1, 0.5);
		button.Position = new UDim2(1, -10, 0.5, 0);
		button.Size = UDim2.fromOffset(132, 26);
		button.BackgroundTransparency = 0;
		button.BorderSizePixel = 0;
		button.Font = Enum.Font.Code;
		button.TextColor3 = theme.text;
		button.TextSize = 13;
		button.Text = configString(key, fallback);
		button.TextXAlignment = Enum.TextXAlignment.Center;
		button.AutoButtonColor = false;
		button.ZIndex = 7;
		button.Parent = item;
		stylizeBox(button);

		let listening = false;
		let pendingCtrl = false;

		function setButtonText(value: string) {
			button.Text = value;
			button.TextTransparency = listening ? 0.18 : 0;
			caption.TextTransparency = listening ? 0.08 : 0;
		}

		settingsTrack(button.MouseEnter.Connect(() => tweenService.Create(button, new TweenInfo(0.14), { BackgroundTransparency: 0.08 }).Play()));
		settingsTrack(button.MouseLeave.Connect(() => tweenService.Create(button, new TweenInfo(0.18), { BackgroundTransparency: 0 }).Play()));
		settingsTrack(button.Activated.Connect(() => {
			if (listening) return;
			listening = true;
			settingsKeyListening = true;
			pendingCtrl = false;
			setButtonText("press key");
		}));

		settingsTrack(inputService.InputBegan.Connect((input, gameProcessed) => {
			if (!listening) return;
			if (gameProcessed && input.KeyCode !== Enum.KeyCode.Escape) return;
			if (input.KeyCode === Enum.KeyCode.Escape) {
				listening = false;
				settingsKeyListening = false;
				pendingCtrl = false;
				setButtonText(configString(key, fallback));
				return;
			}
			const base = baseInputName(input);
			if (isCtrlName(base)) {
				pendingCtrl = true;
				setButtonText("Ctrl+...");
				return;
			}
			const value = pendingCtrl || ctrlDownFor(input) ? `Ctrl+${base}` : base;
			setConfigValue(key, value);
			listening = false;
			settingsKeyListening = false;
			pendingCtrl = false;
			setButtonText(value);
		}));
	}

	section("targeting");
	makeDropdown("Target priority", "targetPriority", ["mouse", "closest", "camera"], "mouse");
	makeToggle("Click through walls", "clickThroughWalls", false);
	makeToggle("Use closest body part", "preferClosestPart", true);
	makeToggle("Require alive players", "requireAliveTarget", true);
	makeToggle("Ignore teammates", "teamCheck", false);

	section("fling");
	makeDropdown("Fling method", "method", ["NaN", "skidfling"], "NaN");
	makeToggle("Predict target movement", "flingPrediction", true);
	let setManualFlingDurationVisible: ((visible: boolean, animated?: boolean) => void) | undefined;
	makeToggle("Auto stop after fling", "autoDetectFling", true, (on) => setManualFlingDurationVisible?.(!on, true));
	const manualFlingDuration = makeSlider("Manual fling time", "manualFlingDuration", 2, 0.25, 8, 0.05, "s");
	setManualFlingDurationVisible = manualFlingDuration.setVisible;
	setManualFlingDurationVisible(config.autoDetectFling !== true, false);
	makeToggle("Keep flinging same target", "repeatSameTarget", false);
	makeToggle("Retry if target escapes", "autoRefling", true);
	makeToggle("Anti fling", "antiFling", false);

	section("handoff");
	makeToggle("Hide avatar", "hideRealCharacter", true);
	makeToggle("Clear movement on menu", "clearInputOnMenu", true);

	section("visuals");
	makeDropdown("Theme", "theme", themeNames as Array<string>, "Tokyo Night");
	makeToggle("Intro animation", "intro", true);
	makeToggle("HRP outlines", "showHRPs", false);
	makeToggle("Local HRP outline", "showGuide", true);
	makeToggle("Watermark", "showWatermark", true);
	makeToggle("Reduced motion", "lowMotion", false);

	section("mobile");
	makeInfo("Detected input", detectedPlatform());
	makeDropdown("Input platform mode", "platformMode", ["auto", "pc", "mobile"], "auto");
	makeToggle("Mobile fling tool", "mobileFlingTool", true);
	makeToggle("Mobile fling all tool", "mobileFlingAllTool", true);
	makeToggle("Mobile cancel tool", "mobileCancelTool", true);

	section("credits");
	makeActionButton("Credits", showCredits);

	section("keybinds");
	makeKeybind("Menu toggle keybind", "menuKey", "RightShift");
	makeKeybind("Click fling keybind", "flingKey", "Ctrl+MouseButton1");
	makeKeybind("Fling all keybind", "flingAllKey", "Ctrl+F");
	makeKeybind("Clear queue keybind", "clearQueueKey", "Backspace");
	makeKeybind("Cancel fling keybind", "cancelFlingKey", "Q");

	let minimized = false;
	const titleFull = title.Text;

	function syncGlow() {
		if (!settingsGlow || !settingsRoot) return;
		settingsGlow.AnchorPoint = settingsRoot.AnchorPoint;
		settingsGlow.Position = settingsRoot.Position;
		settingsGlow.Size = UDim2.fromOffset(settingsRoot.AbsoluteSize.X + 26, settingsRoot.AbsoluteSize.Y + 26);
		settingsGlow.Visible = settingsRoot.Visible;
	}

	settingsTrack(root.GetPropertyChangedSignal("Position").Connect(syncGlow));
	settingsTrack(root.GetPropertyChangedSignal("Size").Connect(syncGlow));
	task.defer(syncGlow);
	dragify(root, top);

	settingsTrack(mini.Activated.Connect(() => {
		minimized = !minimized;
		if (closeOpenDropdown) closeOpenDropdown();
		if (minimized) {
			closeCredits(false);
			rootSize.MinSize = new Vector2(220, 36);
			content.Visible = false;
			mathStrip.Visible = false;
			topFill.Visible = false;
			title.Text = "NBF9000";
			title.Size = UDim2.fromOffset(86, 36);
			for (const line of scanlines) line.Visible = false;
			tweenService.Create(root, new TweenInfo(0.25, Enum.EasingStyle.Cubic, Enum.EasingDirection.Out), {
				Size: UDim2.fromOffset(230, 36),
			}).Play();
			tweenService.Create(miniBar, new TweenInfo(0.2), { Rotation: 180 }).Play();
		} else {
			title.Text = titleFull;
			title.Size = UDim2.fromOffset(176, 36);
			tweenService.Create(root, new TweenInfo(0.25, Enum.EasingStyle.Cubic, Enum.EasingDirection.Out), {
				Size: fullSize,
			}).Play();
			tweenService.Create(miniBar, new TweenInfo(0.2), { Rotation: 0 }).Play();
			task.delay(0.13, () => {
				content.Visible = true;
				mathStrip.Visible = true;
				topFill.Visible = true;
				rootSize.MinSize = new Vector2(330, 304);
				for (const line of scanlines) line.Visible = true;
			});
		}
	}));

	const started = os.clock();
	settingsConn = runService.RenderStepped.Connect(() => {
		if (!settingsRoot?.Parent) return;
		const t = os.clock() - started;
		const motion = config.lowMotion === true ? 0.2 : 1;
		const pulse = math.sin(t * 1.8 * motion);
		rootStroke.Transparency = 0.05 + pulse * 0.03;
		const strokeGrad = rootStroke.FindFirstChildOfClass("UIGradient");
		if (strokeGrad) strokeGrad.Rotation = (t * 42 * motion) % 360;
		glowGrad.Rotation = (t * -34 * motion) % 360;
		glowStroke.Transparency = 0.58 + pulse * 0.05;
		titleGrad.Offset = new Vector2(math.sin(t * 1.6 * motion) * 0.25, 0);
		const width = math.max(24, mathStrip.AbsoluteSize.X);
		const height = math.max(10, mathStrip.AbsoluteSize.Y);
		const points = new Array<Vector2>();
		const phase = t * 4.2 * motion;
		for (let i = 0; i < mathNodes.size(); i++) {
			const u = mathNodes.size() === 1 ? 0.5 : i / (mathNodes.size() - 1);
			const xPhase = u * math.pi * 4;
			const wave = math.sin(xPhase - phase) * 0.74 + math.sin(xPhase * 2 - phase * 1.35) * 0.12;
			const point = new Vector2(3 + u * (width - 6), height * 0.5 + wave * height * 0.26);
			points.push(point);
			const dot = mathNodes[i];
			dot.Position = UDim2.fromOffset(point.X, point.Y);
			dot.BackgroundColor3 = accentColor(t * 0.13 + u * 0.55);
		}
		for (let i = 0; i < mathLines.size(); i++) {
			const a = points[i];
			const b = points[i + 1];
			const line = mathLines[i];
			if (!a || !b) continue;
			const delta = b.sub(a);
			line.Position = UDim2.fromOffset((a.X + b.X) * 0.5, (a.Y + b.Y) * 0.5);
			line.Size = UDim2.fromOffset(math.max(1, delta.Magnitude), 1);
			let angle = delta.X === 0 ? (delta.Y >= 0 ? 90 : -90) : math.atan(delta.Y / delta.X) * 180 / math.pi;
			if (delta.X < 0) angle += 180;
			line.Rotation = angle;
			line.BackgroundColor3 = accentColor(t * 0.13 + i / math.max(1, mathLines.size()));
		}
		syncGlow();
	});

	if (from) {
		tweenService.Create(root, new TweenInfo(0.34, Enum.EasingStyle.Cubic, Enum.EasingDirection.Out), {
			Position: UDim2.fromScale(0.5, 0.5),
			Size: fullSize,
		}).Play();
		task.delay(0.2, () => {
			if (!root.Parent) return;
			content.Visible = true;
			for (const line of scanlines) line.Visible = true;
			rootSize.MinSize = new Vector2(330, 304);
		});
	} else {
		tweenService.Create(rootScale, new TweenInfo(0.24, Enum.EasingStyle.Quint, Enum.EasingDirection.Out), {
			Scale: 1,
		}).Play();
	}
	updateMobileTools();
}

function toggleSettingsMenu() {
	if (!settingsGui?.Parent || !settingsRoot) {
		showSettingsMenu();
		return;
	}
	const visible = !settingsRoot.Visible;
	settingsRoot.Visible = visible;
	if (settingsGlow) settingsGlow.Visible = visible;
}

function playIntro() {
	killIntro();
	const theme = currentTheme();

	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "nbf9000Intro";
	screenGui.IgnoreGuiInset = true;
	screenGui.ResetOnSpawn = false;
	screenGui.DisplayOrder = 2147483647;
	screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling;
	screenGui.Parent = gethui();
	introGui = screenGui;

	const asset = introAsset();
	if (asset) {
		const snd = new Instance("Sound");
		snd.Name = "nbf9000Intro";
		snd.SoundId = asset;
		snd.Volume = 3;
		snd.Looped = false;
		snd.PlaybackSpeed = 1;
		snd.Parent = soundService;
		task.spawn(() => {
			if (!snd.Parent) return;
			for (let i = 0; i < 180 && !snd.IsLoaded; i++) {
				runService.RenderStepped.Wait();
			}
			snd.Stop();
			task.wait();
			snd.TimePosition = 0;
			task.wait();
			soundService.PlayLocalSound(snd);
		});
		introSound = snd;
	}

	const shade = new Instance("Frame");
	shade.Size = UDim2.fromScale(1, 1);
	shade.BackgroundColor3 = theme.surface;
	shade.BackgroundTransparency = 1;
	shade.BorderSizePixel = 0;
	shade.ZIndex = 1;
	shade.Parent = screenGui;

	const borderFrames = new Array<Frame>();
	const borderGrads = new Array<UIGradient>();
	const borderSpecs = [
		{ pos: new UDim2(0, 0, 0, 0), size: new UDim2(1, 0, 0, 2), rot: 0 },
		{ pos: new UDim2(0, 0, 1, -2), size: new UDim2(1, 0, 0, 2), rot: 180 },
		{ pos: new UDim2(0, 0, 0, 0), size: new UDim2(0, 2, 1, 0), rot: 90 },
		{ pos: new UDim2(1, -2, 0, 0), size: new UDim2(0, 2, 1, 0), rot: 270 },
	];
	for (const spec of borderSpecs) {
		const frame = new Instance("Frame");
		frame.Position = spec.pos;
		frame.Size = spec.size;
		frame.BackgroundColor3 = new Color3(1, 1, 1);
		frame.BackgroundTransparency = 1;
		frame.BorderSizePixel = 0;
		frame.ZIndex = 2;
		frame.Parent = screenGui;
		borderFrames.push(frame);

		const grad = new Instance("UIGradient");
		grad.Color = accentSequence();
		grad.Rotation = spec.rot;
		grad.Parent = frame;
		borderGrads.push(grad);
	}

	const card = new Instance("Frame");
	card.AnchorPoint = new Vector2(0.5, 0.5);
	card.Position = UDim2.fromScale(0.5, 0.5);
	card.Size = new UDim2(0.82, 0, 0, 136);
	card.BackgroundColor3 = theme.bg;
	card.BackgroundTransparency = 1;
	card.BorderSizePixel = 0;
	card.ClipsDescendants = true;
	card.ZIndex = 3;
	card.Parent = screenGui;

	const corner = new Instance("UICorner");
	corner.CornerRadius = new UDim(0, 7);
	corner.Parent = card;

	const cardSize = new Instance("UISizeConstraint");
	cardSize.MinSize = new Vector2(260, 136);
	cardSize.MaxSize = new Vector2(390, 136);
	cardSize.Parent = card;

	const scale = new Instance("UIScale");
	scale.Scale = 0.94;
	scale.Parent = card;

	const stroke = new Instance("UIStroke");
	stroke.Thickness = 1;
	stroke.Color = new Color3(1, 1, 1);
	stroke.Transparency = 1;
	stroke.Parent = card;

	const edge = new Instance("UIGradient");
	edge.Color = accentSequence();
	edge.Parent = stroke;

	const top = new Instance("Frame");
	top.Position = new UDim2(0, 0, 0, 0);
	top.Size = new UDim2(1, 0, 0, 18);
	top.BackgroundColor3 = theme.top;
	top.BackgroundTransparency = 1;
	top.BorderSizePixel = 0;
	top.ZIndex = 4;
	top.Parent = card;

	const topCorner = new Instance("UICorner");
	topCorner.CornerRadius = new UDim(0, 7);
	topCorner.Parent = top;

	const topFill = new Instance("Frame");
	topFill.Position = new UDim2(0, 0, 0, 7);
	topFill.Size = new UDim2(1, 0, 1, -7);
	topFill.BackgroundColor3 = top.BackgroundColor3;
	topFill.BackgroundTransparency = 1;
	topFill.BorderSizePixel = 0;
	topFill.ZIndex = 4;
	topFill.Parent = top;

	const title = makeIntroText(card, "NBF9000", 28, 45, true);
	const sub = makeIntroText(card, ":3 :3 :3 :3 :3 :3 :3", 13, 78);
	title.TextTransparency = 1;
	title.TextStrokeTransparency = 1;
	sub.TextTransparency = 1;
	sub.TextStrokeTransparency = 1;
	const boot = makeIntroText(card, "ctrl+mb1 / tap player", 12, 100);
	boot.TextTransparency = 1;
	boot.TextStrokeTransparency = 1;
	const titleGrad = accentGradient(title);
	const subGrad = accentGradient(sub);

	const barBox = new Instance("Frame");
	barBox.AnchorPoint = new Vector2(0.5, 1);
	barBox.Position = new UDim2(0.5, -2, 1, 0);
	barBox.Size = new UDim2(1, -22, 0, 42);
	barBox.BackgroundTransparency = 1;
	barBox.BorderSizePixel = 0;
	barBox.ZIndex = 4;
	barBox.Parent = card;

	const bars = new Array<Frame>();
	const barGoal = new Array<number>();
	for (let i = 0; i < 27; i++) {
		const bar = new Instance("Frame");
		bar.AnchorPoint = new Vector2(0, 1);
		bar.Position = new UDim2(i / 26, 0, 1, 0);
		bar.Size = new UDim2(0, 7, 0, 3);
		bar.BackgroundColor3 = new Color3(1, 1, 1);
		bar.BackgroundTransparency = 0.18;
		bar.BorderSizePixel = 0;
		bar.ZIndex = 4;
		bar.Parent = barBox;
		bars.push(bar);
		barGoal.push(8);
	}

	const scanlines = new Array<Frame>();
	for (let i = 0; i < 9; i++) {
		const line = new Instance("Frame");
		line.Position = new UDim2(0, 0, 0, 24 + i * 13);
		line.Size = new UDim2(1, 0, 0, 1);
		line.BackgroundColor3 = new Color3(1, 1, 1);
		line.BackgroundTransparency = 0.94;
		line.BorderSizePixel = 0;
		line.ZIndex = 3;
		line.Parent = card;
		scanlines.push(line);
	}

	const flash = new Instance("Frame");
	flash.Size = UDim2.fromScale(1, 1);
	flash.BackgroundColor3 = new Color3(1, 1, 1);
	flash.BackgroundTransparency = 1;
	flash.BorderSizePixel = 0;
	flash.ZIndex = 20;
	flash.Parent = screenGui;

	tweenService.Create(scale, new TweenInfo(0.25, Enum.EasingStyle.Quint, Enum.EasingDirection.Out), { Scale: 1 }).Play();
	tweenService.Create(shade, new TweenInfo(0.12), { BackgroundTransparency: 0.18 }).Play();
	tweenService.Create(card, new TweenInfo(0.12), { BackgroundTransparency: 0.04 }).Play();
	tweenService.Create(top, new TweenInfo(0.12), { BackgroundTransparency: 0 }).Play();
	tweenService.Create(topFill, new TweenInfo(0.12), { BackgroundTransparency: 0 }).Play();
	tweenService.Create(stroke, new TweenInfo(0.12), { Transparency: 0 }).Play();
	for (const frame of borderFrames) tweenService.Create(frame, new TweenInfo(0.12), { BackgroundTransparency: 0.18 }).Play();
	tweenService.Create(title, new TweenInfo(0.12), { TextTransparency: 0, TextStrokeTransparency: 0.25 }).Play();
	tweenService.Create(sub, new TweenInfo(0.12), { TextTransparency: 0.12, TextStrokeTransparency: 0.55 }).Play();
	tweenService.Create(boot, new TweenInfo(0.12), { TextTransparency: 0.26, TextStrokeTransparency: 0.55 }).Play();

	const start = os.clock();
	let lastBar = 0;
	let lastUi = 0;
	let lastLoud = 0;
	let loud = 0.35;
	let closing = false;
	introConn = runService.RenderStepped.Connect(() => {
		const t = os.clock() - start;
		if (t - lastLoud > 0.08) {
			lastLoud = t;
			loud = introSound ? math.clamp(introSound.PlaybackLoudness / 650, 0, 1) : 0.35;
		}
		if (t - lastUi < 1 / 30) {
			if (t <= 2.75 || closing) return;
		} else {
			lastUi = t;
		}
		const borderThick = math.floor(2 + loud * 2);
		borderFrames[0].Size = new UDim2(1, 0, 0, borderThick);
		borderFrames[1].Position = new UDim2(0, 0, 1, -borderThick);
		borderFrames[1].Size = new UDim2(1, 0, 0, borderThick);
		borderFrames[2].Size = new UDim2(0, borderThick, 1, 0);
		borderFrames[3].Position = new UDim2(1, -borderThick, 0, 0);
		borderFrames[3].Size = new UDim2(0, borderThick, 1, 0);
		for (const [i, grad] of ipairs(borderGrads)) {
			grad.Offset = new Vector2(math.sin(t * 0.42 + i * 0.6) * 0.18, math.cos(t * 0.31 + i * 0.45) * 0.08);
		}
		for (const frame of borderFrames) frame.BackgroundTransparency = 0.24 - loud * 0.08;
		edge.Rotation = (edge.Rotation + 1.4) % 360;
		edge.Offset = new Vector2(math.sin(t * 0.26) * 0.25, 0);
		const textOffset = new Vector2(math.sin(t * 4) * 0.28, 0);
		titleGrad.Offset = textOffset;
		subGrad.Offset = textOffset;
		boot.TextColor3 = theme.muted;
		if (t - lastBar > 0.055) {
			lastBar = t;
			for (let i = 0; i < bars.size(); i++) {
				const wave = math.abs(math.sin(t * 5.5 + i * 0.42));
				barGoal[i] = 6 + math.random(0, 12) + wave * 8 + loud * (14 + wave * 30 + math.random(0, 12));
			}
		}
		for (const [i, bar] of ipairs(bars)) {
			const h = barGoal[i - 1] ?? 8;
			bar.Size = new UDim2(0, 7, 0, h);
			bar.BackgroundColor3 = accentColor(t * 0.32 + i * 0.065);
		}
		if (t > 2.75 && introGui && !closing) {
			closing = true;
			const con = introConn;
			introConn = undefined;
			if (con) con.Disconnect();
			showSettingsMenu(card);
			tweenService.Create(shade, new TweenInfo(0.28), { BackgroundTransparency: 1 }).Play();
			for (const frame of borderFrames) tweenService.Create(frame, new TweenInfo(0.2), { BackgroundTransparency: 1 }).Play();
			tweenService.Create(card, new TweenInfo(0.2), { BackgroundTransparency: 1 }).Play();
			tweenService.Create(top, new TweenInfo(0.2), { BackgroundTransparency: 1 }).Play();
			tweenService.Create(topFill, new TweenInfo(0.2), { BackgroundTransparency: 1 }).Play();
			tweenService.Create(flash, new TweenInfo(0.22), { BackgroundTransparency: 1 }).Play();
			tweenService.Create(stroke, new TweenInfo(0.22), { Transparency: 1 }).Play();
			for (const label of [title, sub, boot]) {
				tweenService.Create(label, new TweenInfo(0.18), {
					TextTransparency: 1,
					TextStrokeTransparency: 1,
				}).Play();
			}
			tweenService.Create(barBox, new TweenInfo(0.18), { BackgroundTransparency: 1 }).Play();
			for (const bar of bars) tweenService.Create(bar, new TweenInfo(0.18), { BackgroundTransparency: 1 }).Play();
			for (const line of scanlines) tweenService.Create(line, new TweenInfo(0.18), { BackgroundTransparency: 1 }).Play();
			tweenService.Create(scale, new TweenInfo(0.22, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { Scale: 0.985 }).Play();
			const snd = introSound;
			if (snd) {
				task.spawn(() => {
					const vol = snd.Volume;
					for (let i = 1; i <= 6 && snd.Parent; i++) {
						snd.Volume = vol * (1 - i / 6);
						runService.RenderStepped.Wait();
					}
					if (snd.Parent) snd.Volume = 0;
				});
			}
			task.delay(0.42, () => {
				if (introGui === screenGui) {
					killIntro();
				} else if (screenGui.Parent) {
					screenGui.Destroy();
				}
			});
		}
	});
}

function updateGuide() {
	if (config.showGuide !== true) {
		clearGuide();
		return;
	}
	const [hum, rp] = charParts(localPlayer.Character);
	if (isDead(hum)) { releaseGuide(); return; }
	const [, sessionRoot] = charParts(sessionModel);
	const root = busy ? rp : (sessionRoot ?? rp);
	if (!root) { clearGuide(); return; }

	const t = os.clock();
	const spin = CFrame.Angles(
		math.sin(t * 2.7 + guideSpinOffset.X) * 2.6 + t * 108,
		math.cos(t * 3.4 + guideSpinOffset.Y) * 3.4 + t * 156,
		math.sin(t * 4.3 + guideSpinOffset.Z) * 2.2 + t * 92,
	);
	const wanted = root.CFrame.mul(spin) as CFrame;

	if (!guidePart) {
		const p = new Instance("Part");
		p.Name = "HRP";
		p.Size = new Vector3(2, 2, 1);
		p.Anchored = true;
		p.CanCollide = false;
		p.CanTouch = false;
		p.CanQuery = false;
		p.Massless = true;
		p.Transparency = 1;
		p.CFrame = wanted;

		const box = new Instance("SelectionBox");
		box.Name = "HRP Outline";
		box.Adornee = p;
		box.LineThickness = 0.03;
		box.SurfaceTransparency = 1;
		box.Parent = p;

		const boxAlt = new Instance("SelectionBox");
		boxAlt.Name = "HRP Outline Alt";
		boxAlt.Adornee = p;
		boxAlt.LineThickness = 0.015;
		boxAlt.SurfaceTransparency = 1;
		boxAlt.Parent = p;

		p.Parent = world;
		guidePart = p;
		guideOutline = box;
		guideOutlineAlt = boxAlt;
		guideTick = t;
	}

	const dt = math.min(t - guideTick, 1 / 15);
	guideTick = t;

	const diff = wanted.Position.sub(guidePart.Position);
	const dist = diff.Magnitude;

	if (dist > 3) {
		const move = math.min(dist, math.max(650, dist * 40) * dt);
		const pos = guidePart.Position.add(diff.Unit.mul(move));
		guidePart.CFrame = new CFrame(pos).mul(wanted.Rotation) as CFrame;
	} else {
		guidePart.CFrame = wanted;
	}

	if (guideOutline) guideOutline.Color3 = accentColor(os.clock() * 0.55);
	if (guideOutlineAlt) guideOutlineAlt.Color3 = accentColor(os.clock() * 0.55 + 0.26);
}

function resetRoot() {
	skidHoldCFrame = undefined;
	skidTweenLastClock = os.clock();
	const [hum, rp] = charParts(localPlayer.Character);
	if (rp) {
		pcall(() => sethiddenproperty(rp, "PhysicsRepRootPart", undefined));
		rp.AssemblyLinearVelocity = Vector3.zero;
		rp.AssemblyAngularVelocity = Vector3.zero;
		rp.Velocity = Vector3.zero;
		rp.RotVelocity = Vector3.zero;
	}
	if (hum) {
		hum.AutoRotate = true;
		pcall(() => sethiddenproperty(hum, "MoveDirectionInternal", Vector3.zero));
		pcall(() => sethiddenproperty(hum, "NetworkHumanoidState", Enum.HumanoidStateType.Running));
	}
}

function saveHumanoidState(hum: Humanoid) {
	if (savedHumanoidState?.hum === hum) return;
	savedHumanoidState = {
		hum,
		autoRotate: hum.AutoRotate,
		walkSpeed: hum.WalkSpeed,
		jumpPower: hum.JumpPower,
		jumpHeight: hum.JumpHeight,
		useJumpPower: hum.UseJumpPower,
		requiresNeck: hum.RequiresNeck,
		breakJointsOnDeath: hum.BreakJointsOnDeath,
	};
}

function restoreHumanoidState() {
	const state = savedHumanoidState;
	savedHumanoidState = undefined;
	if (!state || !state.hum.Parent) return;
	state.hum.AutoRotate = state.autoRotate;
	state.hum.WalkSpeed = state.walkSpeed;
	state.hum.UseJumpPower = state.useJumpPower;
	state.hum.JumpPower = state.jumpPower;
	state.hum.JumpHeight = state.jumpHeight;
	state.hum.RequiresNeck = state.requiresNeck;
	state.hum.BreakJointsOnDeath = state.breakJointsOnDeath;
}

function restoreAlpha() {
	for (const [p, state] of savedPartState) {
		if (p.Parent) {
			p.LocalTransparencyModifier = state.transparency;
			p.CanCollide = state.collision;
		}
	}
	savedPartState.clear();
	maskedChar = undefined;
}

function suspendAnimate(char?: Model) {
	if (!char) return;
	for (const obj of char.GetDescendants()) {
		if (obj.IsA("LocalScript") && obj.Name === "Animate") {
			if (!savedScriptDisabled.has(obj)) savedScriptDisabled.set(obj, obj.Disabled);
			obj.Disabled = true;
		}
	}
}

function stopTracks(hum?: Humanoid, airOnly = false) {
	const animator = hum?.FindFirstChildOfClass("Animator");
	if (!animator) return;
	for (const track of animator.GetPlayingAnimationTracks()) {
		if (!airOnly || isAirAnimationId(trackAnimationId(track))) track.Stop(0);
	}
}

function restoreAnimate() {
	for (const [script, disabled] of savedScriptDisabled) {
		if (script.Parent) script.Disabled = disabled;
	}
	savedScriptDisabled.clear();
}

function restoreTargetCollision() {
	for (const [p, c] of targetCollision) {
		if (p.Parent) p.CanCollide = c;
	}
	targetCollision.clear();
}

function restoreAntiFlingCollision() {
	for (const [p, c] of antiFlingCollision) {
		if (!p.Parent) {
			antiFlingCollision.delete(p);
		} else if (!targetCollision.has(p)) {
			p.CanCollide = c;
			antiFlingCollision.delete(p);
		}
	}
}

function noCollideTarget(tgt: Tgt) {
	if (!typeIs(tgt, "Instance")) return;
	const char = tgt.IsA("Model") ? tgt : (tgt.IsA("BasePart") ? charFromPart(tgt) : undefined);
	if (!char || char === localPlayer.Character || char === sessionModel) return;
	for (const obj of char.GetDescendants()) {
		if (obj.IsA("BasePart")) {
			if (!targetCollision.has(obj)) targetCollision.set(obj, obj.CanCollide);
			obj.CanCollide = false;
		}
	}
}

function updateAntiFling() {
	if (config.antiFling !== true || (method === "skidfling" && queue[0] !== undefined)) {
		restoreAntiFlingCollision();
		return;
	}
	for (const player of players.GetPlayers()) {
		if (player === localPlayer) continue;
		const char = player.Character;
		if (!char) continue;
		for (const obj of char.GetDescendants()) {
			if (obj.IsA("BasePart")) {
				if (!antiFlingCollision.has(obj)) antiFlingCollision.set(obj, obj.CanCollide);
				if (obj.CanCollide !== false) obj.CanCollide = false;
			}
		}
	}
	for (const [part] of antiFlingCollision) {
		if (!part.Parent) antiFlingCollision.delete(part);
	}
}

function maskChar(char?: Model) {
	if (!char) return;
	if (maskedChar && maskedChar !== char) restoreAlpha();
	maskedChar = char;
	for (const obj of char.GetDescendants()) {
		if (obj.IsA("BasePart")) {
			if (!savedPartState.has(obj)) {
				savedPartState.set(obj, {
					transparency: obj.LocalTransparencyModifier,
					collision: obj.CanCollide,
				});
			}
			if (config.hideRealCharacter !== false) obj.LocalTransparencyModifier = 1;
			obj.CanCollide = false;
			zeroPartVelocity(obj);
		}
	}
	suspendAnimate(char);
	stopTracks(char.FindFirstChildOfClass("Humanoid"));
}

function enableSkidFlingCollision(char?: Model) {
	if (!char) return;
	for (const obj of char.GetDescendants()) {
		if (obj.IsA("BasePart")) {
			obj.CanCollide = true;
		}
	}
}

function zeroPartVelocity(part: BasePart) {
	part.AssemblyLinearVelocity = Vector3.zero;
	part.AssemblyAngularVelocity = Vector3.zero;
	part.Velocity = Vector3.zero;
	part.RotVelocity = Vector3.zero;
}

function trackAnimationId(track: AnimationTrack) {
	const anim = (track as unknown as { Animation?: Animation }).Animation;
	const id = anim?.AnimationId;
	return typeIs(id, "string") && id.size() > 0 ? id : undefined;
}

function isAirAnimationId(id?: string) {
	return id === anims.R6.jump
		|| id === anims.R6.fall
		|| id === anims.R15.jump
		|| id === anims.R15.fall;
}

function snapshotTrackPhases(model?: Model) {
	const hum = model?.FindFirstChildOfClass("Humanoid");
	const animator = hum?.FindFirstChildOfClass("Animator");
	const phases = new Map<string, number>();
	if (!animator) return phases;
	let bestPhase: number | undefined;
	let bestWeight = -1;
	for (const track of animator.GetPlayingAnimationTracks()) {
		const id = trackAnimationId(track);
		if (id) phases.set(id, track.TimePosition);
		if (!isAirAnimationId(id) && track.WeightCurrent >= bestWeight) {
			bestPhase = track.TimePosition;
			bestWeight = track.WeightCurrent;
		}
	}
	if (bestPhase !== undefined) phases.set(mainTrackPhaseKey, bestPhase);
	return phases;
}

function applyTrackPhases(hum: Humanoid | undefined, phases?: Map<string, number>) {
	if (!hum || !phases) return;
	const animator = hum?.FindFirstChildOfClass("Animator");
	if (!animator) return;
	for (const track of animator.GetPlayingAnimationTracks()) {
		const id = trackAnimationId(track);
		const time = (id ? phases.get(id) : undefined) ?? (!isAirAnimationId(id) ? phases.get(mainTrackPhaseKey) : undefined);
		if (time !== undefined) {
			pcall(() => {
				const len = track.Length;
				track.TimePosition = len > 0 ? time % len : time;
			});
		}
	}
}

function snapshotPose(model?: Model) {
	const pose = new Map<string, CFrame>();
	if (!model) return pose;
	for (const obj of model.GetDescendants()) {
		if (obj.IsA("Motor6D")) {
			pose.set(obj.Name, obj.Transform);
		}
	}
	return pose;
}

function applyPose(model: Model | undefined, pose?: Map<string, CFrame>) {
	if (!model || !pose) return;
	for (const obj of model.GetDescendants()) {
		if (obj.IsA("Motor6D")) {
			const transform = pose.get(obj.Name);
			if (transform) obj.Transform = transform;
		}
	}
}

function setCameraSubject(subject: Humanoid | BasePart) {
	cam = world.CurrentCamera;
	if (!cam) return;
	const cf = cam.CFrame;
	cam.CameraSubject = subject;
	cam.CFrame = cf;
}

function setSessionRootAnchored(anchored: boolean) {
	const [, root] = charParts(sessionModel);
	if (!root) return;
	root.Anchored = anchored;
	sessionRootAnchored = anchored;
	if (anchored) zeroPartVelocity(root);
	else {
		zeroPartVelocity(root);
		const [hum] = charParts(sessionModel);
		if (hum) hum.ChangeState(Enum.HumanoidStateType.RunningNoPhysics);
	}
}

function tickSessionSpawnAnchor() {
	if (!sessionRootAnchored) return;
	if (sessionAnchorFrames > 0) {
		sessionAnchorFrames--;
		return;
	}
	setSessionRootAnchored(false);
}

function clearSessionModel(sync: boolean) {
	const model = sessionModel;
	const [, sessionRoot] = charParts(model);
	const char = localPlayer.Character;
	const [hum, rp] = charParts(char);
	const retCf = sync && sessionRoot ? sessionRoot.CFrame : undefined;
	const retVelRaw = sync && sessionRoot ? sessionRoot.AssemblyLinearVelocity : Vector3.zero;
	const retVel = retVelRaw.Y < 0.5 ? new Vector3(retVelRaw.X, 0, retVelRaw.Z) : retVelRaw;
	const retPose = sync ? snapshotPose(model) : undefined;
	const retPhases = sync ? snapshotTrackPhases(model) : undefined;

	busy = false;

	if (model) model.Destroy();
	sessionModel = undefined;
	runtime.sessionModel = undefined;
	sessionRootAnchored = false;
	sessionAnchorFrames = 0;
	restoreTargetCollision();
	resetRoot();
	restoreHumanoidState();
	stopTracks(hum, true);
	applyTrackPhases(hum, retPhases);
	applyPose(char, retPose);
	if (retCf && rp) {
		rp.CFrame = retCf;
		rp.AssemblyLinearVelocity = retVel;
		rp.AssemblyAngularVelocity = Vector3.zero;
		rp.Velocity = retVel;
		rp.RotVelocity = Vector3.zero;
	}
	if (sync && hum) {
		hum.SetStateEnabled(Enum.HumanoidStateType.Seated, true);
		hum.Jump = false;
		hum.Sit = false;
		hum.PlatformStand = false;
		pcall(() => sethiddenproperty(hum, "MoveDirectionInternal", Vector3.zero));
		pcall(() => sethiddenproperty(hum, "NetworkHumanoidState", Enum.HumanoidStateType.Running));
		hum.ChangeState(Enum.HumanoidStateType.RunningNoPhysics);
		task.defer(() => {
			if (!hum.Parent) {
				restoreAnimate();
				restoreAlpha();
				return;
			}
			hum.Jump = false;
			hum.Sit = false;
			hum.PlatformStand = false;
			pcall(() => sethiddenproperty(hum, "MoveDirectionInternal", Vector3.zero));
			pcall(() => sethiddenproperty(hum, "NetworkHumanoidState", Enum.HumanoidStateType.Running));
			stopTracks(hum, true);
			applyTrackPhases(hum, retPhases);
			hum.ChangeState(Enum.HumanoidStateType.Running);
			applyPose(char, retPose);
			restoreAlpha();
			setCameraSubject(hum);
			task.spawn(() => {
				if (runService.PreAnimation) runService.PreAnimation.Wait();
				else runService.RenderStepped.Wait();
				if (!hum.Parent) {
					return;
				}
				pcall(() => sethiddenproperty(hum, "NetworkHumanoidState", Enum.HumanoidStateType.Running));
				hum.ChangeState(Enum.HumanoidStateType.Running);
				applyTrackPhases(hum, retPhases);
				applyPose(char, retPose);
				restoreAnimate();
			});
		});
	} else {
		if (hum) hum.SetStateEnabled(Enum.HumanoidStateType.Seated, true);
		restoreAnimate();
		restoreAlpha();
	}
	setDestroyH(originalDestroyHeight);
	destroyHeightSet = false;

	if ((!sync || !hum) && hum) setCameraSubject(hum);
}

function dropDeadChar(char?: Model) {
	if (!char) return;
	queue.clear();
	cooldowns.clear();
	busy = false;
	releaseGuide();
	clearSessionModel(false);
}

function stop() {
	for (const c of connections) c.Disconnect();
	connections.clear();
	if (deathConn) {
		deathConn.Disconnect();
		deathConn = undefined;
	}
	queue.clear();
	cooldowns.clear();
	runService.UnbindFromRenderStep("nbf9000");
	clearSessionModel(false);
	restoreAntiFlingCollision();
	clearGuide();
	clearHrpOutlines();
	killIntro();
	destroySettingsMenu();
	clearMobileTools();
	clearWatermark();
}

function bindCharacter(char?: Model) {
	if (deathConn) {
		deathConn.Disconnect();
		deathConn = undefined;
	}
	setDestroyH(originalDestroyHeight);
	destroyHeightSet = false;
	if (!char) return;
	const hum = char.FindFirstChildOfClass("Humanoid");
	if (!hum) return;
	deathConn = hum.Died.Connect(() => {
		dropDeadChar(char);
	});
}

function prepareSessionModel(char: Model) {
	for (const obj of char.GetDescendants()) {
		if (obj.IsA("Script") || obj.IsA("LocalScript")) {
			obj.Destroy();
		} else if (obj.IsA("BasePart")) {
			obj.Anchored = false;
			obj.CanTouch = false;
			obj.CanQuery = false;
			obj.LocalTransparencyModifier = 0;
		} else if (obj.IsA("ForceField")) {
			obj.Visible = false;
		}
	}
}

function createTrack(anim: Animator, id: string | undefined, pri: Enum.AnimationPriority, loop: boolean) {
	if (!id || id.size() === 0) return;
	const a = new Instance("Animation");
	a.AnimationId = id;
	const [ok, t] = pcall(() => anim.LoadAnimation(a));
	a.Destroy();
	if (ok && t) {
		t.Priority = pri;
		t.Looped = loop;
		return t;
	}
}

function animateSessionModel(char: Model, hum: Humanoid, phases?: Map<string, number>) {
	const anim = hum.FindFirstChildOfClass("Animator") ?? new Instance("Animator");
	anim.Parent = hum;

	const isR15 = hum.RigType === Enum.HumanoidRigType.R15;
	const set = isR15 ? anims.R15 : anims.R6;
	const idlePriority = isR15 ? Enum.AnimationPriority.Idle : Enum.AnimationPriority.Core;
	const movePriority = isR15 ? Enum.AnimationPriority.Movement : Enum.AnimationPriority.Core;
	const actionPriority = isR15 ? Enum.AnimationPriority.Action : Enum.AnimationPriority.Core;
	type TrackName = "idle" | "walk" | "run" | "jump" | "fall";

	let currentName: TrackName | undefined;
	let currentTrack: AnimationTrack | undefined;

	function animationId(name: TrackName) {
		if (name === "idle" && !isR15) {
			return math.random(1, 10) === 10 ? anims.R6.idleAlt : anims.R6.idle;
		}
		if (name === "walk") return set.walk;
		if (name === "run") return set.run;
		if (name === "jump") return set.jump;
		if (name === "fall") return set.fall;
		return set.idle;
	}

	function animationPriority(name: TrackName) {
		if (name === "walk" || name === "run") return movePriority;
		if (name === "jump" || name === "fall") return actionPriority;
		return idlePriority;
	}

	function animationLooped(name: TrackName) {
		return name !== "jump";
	}

	function play(name: TrackName, fade: number) {
		if (currentName === name && currentTrack?.IsPlaying) return;
		const id = animationId(name);
		const track = createTrack(anim, id, animationPriority(name), animationLooped(name));
		if (!track) return;
		if (currentTrack) {
			currentTrack.Stop(fade);
			currentTrack.Destroy();
		}
		currentName = name;
		currentTrack = track;
		track.Play(fade);
		const phase = (id ? phases?.get(id) : undefined) ?? (!isAirAnimationId(id) ? phases?.get(mainTrackPhaseKey) : undefined);
		if (phase !== undefined) {
			pcall(() => {
				const len = track.Length;
				track.TimePosition = len > 0 ? phase % len : phase;
			});
		}
	}

	function setAnimationSpeed(speed: number) {
		currentTrack?.AdjustSpeed(speed);
	}

	function moveSpeed() {
		const [, root] = charParts(char);
		const flatVelocity = root
			? new Vector3(root.AssemblyLinearVelocity.X, 0, root.AssemblyLinearVelocity.Z).Magnitude
			: 0;
		const inputSpeed = hum.WalkSpeed * math.min(keys.move.Magnitude, 1);
		return math.max(flatVelocity, inputSpeed);
	}

	function playMove(speed = moveSpeed()) {
		if (!isR15) {
			play("walk", 0.1);
			setAnimationSpeed(math.max(speed / 14.5, 0.1));
			return;
		}
		const name = speed > 7 && set.run ? "run" : "walk";
		play(name, 0.15);
		setAnimationSpeed(math.max(speed / 16, 0.1));
	}

	let jumpTime = 0;
	let lastTick = os.clock();
	let cn: RBXScriptConnection;
	cn = runService.PreAnimation.Connect(() => {
		if (!sessionModel || !sessionModel.Parent || !hum.Parent) { cn.Disconnect(); return; }
		const now = os.clock();
		const dt = now - lastTick;
		lastTick = now;
		if (jumpTime > 0) jumpTime = math.max(jumpTime - dt, 0);

		const st = hum.GetState();
		const speed = moveSpeed();
		const inputMoving = keys.move.Magnitude > 0.05;
		if (sessionRootAnchored) {
			if (inputMoving) playMove(speed);
			else play("idle", 0.1);
			return;
		}
		const moving = inputMoving || speed > (busy ? 3.4 : 4.2);
		if (st === Enum.HumanoidStateType.Jumping || hum.Jump) {
			jumpTime = 0.3;
			play("jump", 0.1);
		} else if (st === Enum.HumanoidStateType.Freefall || st === Enum.HumanoidStateType.FallingDown) {
			if (jumpTime > 0) {
				play("jump", 0.1);
				return;
			}
			play("fall", 0.2);
		} else if (moving) {
			playMove(speed);
		} else {
			play("idle", 0.2);
		}
	});

	char.Destroying.Once(() => {
		cn.Disconnect();
		if (currentTrack) {
			currentTrack.Stop(0);
			currentTrack.Destroy();
		}
	});
}

function spawnSessionModel() {
	const char = localPlayer.Character;
	const [, rp] = charParts(char);
	if (!char || !rp) return;
	const spawnPivot = char.GetPivot();
	const spawnPose = snapshotPose(char);
	const spawnPhases = snapshotTrackPhases(char);

	if (sessionModel) sessionModel.Destroy();

	const arc = char.Archivable;
	char.Archivable = true;
	const g = char.Clone();
	char.Archivable = arc;
	if (!g) return;

	g.Name = "nbf9000Rig";
	prepareSessionModel(g);
	g.Parent = world;
	g.PivotTo(spawnPivot);

	const [sessionHum, sessionRoot] = charParts(g);
	if (!sessionHum || !sessionRoot) { g.Destroy(); return; }

	sessionHum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None;
	sessionHum.RequiresNeck = false;
	sessionHum.BreakJointsOnDeath = false;
	sessionHum.UseJumpPower = true;
	sessionHum.WalkSpeed = math.max(sessionHum.WalkSpeed, 16);
	sessionHum.JumpPower = math.max(sessionHum.JumpPower, 50);
	sessionHum.Health = sessionHum.MaxHealth;
	sessionHum.AutoRotate = true;
	sessionHum.SetStateEnabled(Enum.HumanoidStateType.Dead, false);
	sessionRoot.RootPriority = 67;
	g.PivotTo(spawnPivot);
	zeroPartVelocity(sessionRoot);
	sessionRoot.Anchored = true;
	sessionRootAnchored = true;
	sessionAnchorFrames = 1;
	sessionHum.ChangeState(Enum.HumanoidStateType.RunningNoPhysics);

	sessionModel = g;
	runtime.sessionModel = g;
	animateSessionModel(g, sessionHum, spawnPhases);
	applyPose(g, spawnPose);

	return $tuple(g, sessionHum, sessionRoot);
}

function targetPart(char: Model) {
	const [, root] = charParts(char);
	if (root) return root;
	if (char.PrimaryPart) return char.PrimaryPart;

	let best: BasePart | undefined;
	let bestSize = 0;
	for (const obj of char.GetDescendants()) {
		if (obj.IsA("BasePart") && !obj.FindFirstAncestorOfClass("Accessory")) {
			const size = obj.Size.X * obj.Size.Y * obj.Size.Z;
			if (size > bestSize) {
				best = obj;
				bestSize = size;
			}
		}
	}
	return best ?? root;
}

function flingPart(tgt: Tgt) {
	if (typeIs(tgt, "Instance")) {
		if (tgt.IsA("Model")) {
			return targetPart(tgt);
		}
		if (tgt.IsA("BasePart")) {
			const char = charFromPart(tgt);
			return char ? targetPart(char) ?? tgt : tgt;
		}
	}
}

function playerFromTarget(tgt: Tgt) {
	if (!typeIs(tgt, "Instance")) return;
	const char = tgt.IsA("Model") ? tgt : (tgt.IsA("BasePart") ? charFromPart(tgt) : undefined);
	return char ? players.GetPlayerFromCharacter(char) : undefined;
}

function repeatPart(item: QueueItem) {
	const player = item.player;
	if (!player || !player.Parent) return;
	const char = player.Character;
	if (!char) return;
	const [hum, root] = charParts(char);
	if (!root || (config.requireAliveTarget !== false && isDead(hum))) return;
	const part = targetPart(char) ?? root;
	item.tgt = part;
	return part;
}

function predict(tgt: Tgt, item?: QueueItem): LuaTuple<[CFrame, boolean]> {
	if (item?.repeat) {
		const part = repeatPart(item);
		if (!part) {
			const [, sessionRoot] = charParts(sessionModel);
			return $tuple(item.lastCFrame ?? sessionRoot?.CFrame ?? CFrame.identity, item.player !== undefined && !item.player.Parent);
		}
		tgt = part;
	}
	if (typeIs(tgt, "Instance")) {
		const part = flingPart(tgt);
		if (part) {
			if (!part.IsDescendantOf(world)) return $tuple(item?.lastCFrame ?? CFrame.identity, item?.repeat === true ? false : true);

			const lead = config.flingPrediction === true && method !== "skidfling" ? 0.045 : 0;
			let cf = new CFrame(part.Position);

			const oldPos = item?.lastPosition;
			if (oldPos && part.Position.sub(oldPos).Magnitude > 200) {
				if (item) {
					item.lastPosition = part.Position;
					item.lastCFrame = cf;
				}
				return $tuple(cf, item?.repeat === true ? false : true);
			}
			if (item) item.lastPosition = part.Position;

			if (lead > 0) cf = cf.add(part.AssemblyLinearVelocity.mul(lead));

			if (item) item.lastCFrame = cf;
			return $tuple(cf, false);
		}
	}
	if (typeIs(tgt, "CFrame")) return $tuple(tgt, false);
	if (typeIs(tgt, "Vector3")) return $tuple(new CFrame(tgt), false);
	return $tuple(CFrame.identity, true);
}

function shouldBackOff(item: QueueItem) {
	const now = os.clock();
	item.start = item.start ?? now;
	item.end = item.end ?? now + (item.dur ?? 2);

	if (!item.repeat && now > item.end) return true;

	const part = item.repeat ? repeatPart(item) : getPart(item.tgt);
	if (item.repeat && item.player !== undefined && !item.player.Parent) return true;
	if (!part) return false;
	if (!part.IsDescendantOf(world)) return item.repeat ? false : true;
	if (item.repeat) return false;
	if (config.autoDetectFling === false) return false;

	item.startPos = item.startPos ?? part.Position;
	if (now - item.start < 0.12) return false;

	const velocity = part.AssemblyLinearVelocity;
	if (method === "skidfling") {
		if (now - item.start < 0.22) return false;
		if (velocity.Magnitude > 500) return true;
		if (part.Position.sub(item.startPos).Magnitude > 150) return true;
		return false;
	}
	if (velocity.Magnitude > 150 || math.abs(velocity.Y) > 115) return true;
	if (part.Position.sub(item.startPos).Magnitude > 80) return true;

	return false;
}

function getPart(tgt: Tgt) {
	if (typeIs(tgt, "Instance")) {
		if (tgt.IsA("Model")) return targetPart(tgt);
		if (tgt.IsA("BasePart")) {
			const char = charFromPart(tgt);
			return char ? targetPart(char) ?? tgt : tgt;
		}
	}
}

function canTargetPlayer(player: Player) {
	if (player === localPlayer) return false;
	if (config.teamCheck === true && localPlayer.Team !== undefined && player.Team === localPlayer.Team) return false;
	const [hum, root] = charParts(player.Character);
	if (!root) return false;
	if (config.requireAliveTarget !== false && isDead(hum)) return false;
	return true;
}

function usableTargetPart(part?: BasePart) {
	if (!part) return;
	const char = charFromPart(part);
	if (!char) return;
	const player = players.GetPlayerFromCharacter(char);
	if (player && !canTargetPlayer(player)) return;
	const [hum] = charParts(char);
	if (config.requireAliveTarget !== false && isDead(hum)) return;
	return config.preferClosestPart === false ? part : targetPart(char) ?? part;
}

function throughWallTarget(pos: Vector3, radius = 46) {
	if (config.clickThroughWalls !== true) return;
	cam = world.CurrentCamera;
	if (!cam) return;

	let best: BasePart | undefined;
	let bestScore = radius;
	for (const player of players.GetPlayers()) {
		if (!canTargetPlayer(player)) continue;
		const char = player.Character;
		const [hum, root] = charParts(char);
		if (!char || !root || (config.requireAliveTarget !== false && isDead(hum))) continue;
		const [screen, visible] = cam.WorldToViewportPoint(root.Position);
		if (!visible || screen.Z <= 0) continue;
		const dist = new Vector2(screen.X - pos.X, screen.Y - pos.Y).Magnitude;
		if (dist < bestScore) {
			best = root;
			bestScore = dist;
		}
	}
	return best;
}

function doHighlight(tgt: Tgt) {
	if (!typeIs(tgt, "Instance")) return;
	const char = tgt.IsA("Model") ? tgt : (tgt.IsA("BasePart") ? charFromPart(tgt) : undefined);
	if (!char) return;
	const hl = new Instance("Highlight");
	hl.Adornee = char;
	hl.FillColor = accentColor(0);
	hl.OutlineColor = accentColor(0.3);
	hl.FillTransparency = 0.72;
	hl.OutlineTransparency = 0;
	hl.Parent = tgt;
	const born = os.clock();
	const conn = runService.RenderStepped.Connect(() => {
		if (!hl.Parent) {
			conn.Disconnect();
			return;
		}
		const t = os.clock() - born;
		hl.FillColor = accentColor(t * 0.55);
		hl.OutlineColor = accentColor(t * 0.55 + 0.22);
	});
	hl.Destroying.Once(() => conn.Disconnect());
	tweenService.Create(hl, new TweenInfo(5), { FillTransparency: 1, OutlineTransparency: 1 }).Play();
	debrisService.AddItem(hl, 5);
}

function queueFlingTarget(tgt: Tgt, dur: number | undefined, repeatMode: boolean, batch: boolean, batchToken?: number) {
	if (!tgt) return false;
	for (const q of queue) { if (q.tgt === tgt) return false; }
	if (tgt === sessionModel || tgt === localPlayer.Character) return false;
	if (typeIs(tgt, "Instance")) {
		if (localPlayer.Character && tgt.IsDescendantOf(localPlayer.Character)) return false;
		if (sessionModel && tgt.IsDescendantOf(sessionModel)) return false;
	}

	if (typeIs(tgt, "Instance")) {
		if (cooldowns.has(tgt)) return false;
		cooldowns.add(tgt);
		task.delay(1, () => cooldowns.delete(tgt));
	}

	const effectiveDur = config.autoDetectFling === false
		? dur ?? math.clamp(configNumber("manualFlingDuration", 2), 0.25, 8)
		: dur;
	queue.push({ tgt, dur: effectiveDur, repeat: repeatMode, batch, batchToken, player: repeatMode ? playerFromTarget(tgt) : undefined });
	doHighlight(tgt);
	return true;
}

function activateFlingSession() {
	busy = true;
	if (!sessionModel) spawnSessionModel();
	resetRoot();
	maskChar(localPlayer.Character);
	const [sessionHum] = charParts(sessionModel);
	if (sessionHum) setCameraSubject(sessionHum);
}

function fling(tgt: Tgt, dur?: number) {
	if (!queueFlingTarget(tgt, dur, config.repeatSameTarget === true, false)) return false;
	activateFlingSession();
	return true;
}

function charFromPart(part?: BasePart) {
	let m = part?.Parent;
	if (!m) return;
	if (m.IsA("Accessory")) m = m.Parent;
	if (m && m.FindFirstChildOfClass("Humanoid")) return m as Model;
}

function rayTarget(pos: Vector3) {
	cam = world.CurrentCamera;
	if (!cam) return;
	const rp = new RaycastParams();
	rp.FilterType = Enum.RaycastFilterType.Exclude;
	const ignore = new Array<Instance>();
	if (localPlayer.Character) ignore.push(localPlayer.Character);
	if (sessionModel) ignore.push(sessionModel);
	rp.FilterDescendantsInstances = ignore;
	rp.IgnoreWater = true;
	const ray = cam.ViewportPointToRay(pos.X, pos.Y);
	const hit = world.Raycast(ray.Origin, ray.Direction.mul(1000), rp);
	return hit ? usableTargetPart(hit.Instance) : undefined;
}

function clicked(pos: Vector3, touchFirst: boolean) {
	const direct = mouse.Target ? usableTargetPart(mouse.Target) : undefined;
	const ray = rayTarget(pos);
	const through = throughWallTarget(pos, touchFirst ? 64 : 46);
	const priority = config.targetPriority ?? "mouse";
	if (priority === "closest") return through ?? direct ?? ray;
	if (priority === "camera" || touchFirst) return ray ?? through ?? direct;
	return direct ?? ray ?? through;
}

function tryFlingTap(pos: Vector3, touchFirst: boolean) {
	const t = clicked(pos, touchFirst);
	if (t) fling(t);
}

function clearFlingQueue(sync = true) {
	queue.clear();
	cooldowns.clear();
	restoreTargetCollision();
	busy = false;
	if (sessionModel) clearSessionModel(sync);
	else resetRoot();
}

function scheduleFlingAllWatchdog(token: number, count: number) {
	const timeout = math.clamp(count * 2.5 + 1, 4, 22);
	task.delay(timeout, () => {
		for (const item of queue) {
			if (item.batchToken === token) {
				clearFlingQueue(true);
				return;
			}
		}
	});
}

function enqueueFlingAllBatch() {
	let did = false;
	let count = 0;
	const token = ++flingAllToken;
	for (const player of players.GetPlayers()) {
		if (!canTargetPlayer(player)) continue;
		const part = player.Character ? targetPart(player.Character) : undefined;
		if (part && queueFlingTarget(part, undefined, false, true, token)) {
			did = true;
			count++;
		}
	}
	if (did) {
		activateFlingSession();
		scheduleFlingAllWatchdog(token, count);
	}
	return did;
}

function flingAll() {
	if (queue.size() > 0 || sessionModel) {
		clearFlingQueue(true);
		task.defer(enqueueFlingAllBatch);
		return true;
	}
	return enqueueFlingAllBatch();
}

function unequipMobileTools() {
	const hum = localPlayer.Character?.FindFirstChildOfClass("Humanoid");
	if (hum) hum.UnequipTools();
}

function runMobileToolAction(tool: Tool, onActivated: () => void) {
	if (!tool.Enabled) return;
	tool.Enabled = false;
	unequipMobileTools();
	task.defer(() => {
		onActivated();
		unequipMobileTools();
		task.delay(0.35, () => {
			if (tool.Parent) tool.Enabled = true;
		});
	});
}

function addMobileTool(name: string, onActivated: () => void) {
	const backpack = localPlayer.FindFirstChild("Backpack");
	if (!backpack) return;
	const tool = new Instance("Tool");
	tool.Name = name;
	tool.RequiresHandle = false;
	tool.CanBeDropped = false;
	tool.ManualActivationOnly = false;
	tool.Parent = backpack;
	mobileTools.push(tool);
	mobileToolConnections.push(tool.Activated.Connect(() => runMobileToolAction(tool, onActivated)));
}

function updateMobileTools() {
	clearMobileTools();
	if (!wantsMobileControls()) return;
	if (config.mobileFlingTool === true) {
		addMobileTool("NBF Fling", () => {
			tryFlingTap(new Vector3(mouse.X, mouse.Y, 0), false);
		});
	}
	if (config.mobileFlingAllTool === true) addMobileTool("NBF Fling All", flingAll);
	if (config.mobileCancelTool === true) addMobileTool("NBF Cancel", () => clearFlingQueue(true));
}

function ctrlDown() {
	return ctrlDownFor();
}

function calcMove() {
	let v = Vector3.zero;
	if (keys.w) v = v.add(new Vector3(0, 0, -1));
	if (keys.s) v = v.add(new Vector3(0, 0, 1));
	if (keys.a) v = v.add(new Vector3(-1, 0, 0));
	if (keys.d) v = v.add(new Vector3(1, 0, 0));
	if (keys.stick.Magnitude > 0.2) v = v.add(new Vector3(keys.stick.X, 0, keys.stick.Y));
	if (v.Magnitude > 1) v = v.Unit;
	keys.move = v;
	keys.wantJump = keys.jump || keys.padJump;
}

function clearMove() {
	keys.w = false; keys.a = false; keys.s = false; keys.d = false;
	keys.jump = false; keys.stick = Vector2.zero; keys.padJump = false;
	keys.move = Vector3.zero; keys.wantJump = false;
}

// input
track(inputService.InputBegan.Connect((inp, gp) => {
	if (inp.UserInputType === Enum.UserInputType.MouseButton1 || inp.UserInputType === Enum.UserInputType.Touch) {
		lastInput = inp; lastWasGui = gp; lastTapTime = os.clock(); lastTapPos = inp.Position;
	}
	const blocked = guiService.MenuIsOpen || inputService.GetFocusedTextBox();
	if (!settingsKeyListening && !blocked && !gp) {
		if (bindMatches(inp, config.menuKey)) {
			toggleSettingsMenu();
			return;
		}
		if (bindMatches(inp, config.flingAllKey)) {
			flingAll();
			return;
		}
		if (bindMatches(inp, config.clearQueueKey) || bindMatches(inp, config.cancelFlingKey)) {
			clearFlingQueue(true);
			return;
		}
	}
	if (blocked) return;
	if (inp.UserInputType === Enum.UserInputType.Keyboard) {
		if (inp.KeyCode === Enum.KeyCode.W || inp.KeyCode === Enum.KeyCode.Up) keys.w = true;
		if (inp.KeyCode === Enum.KeyCode.S || inp.KeyCode === Enum.KeyCode.Down) keys.s = true;
		if (inp.KeyCode === Enum.KeyCode.A) keys.a = true;
		if (inp.KeyCode === Enum.KeyCode.D) keys.d = true;
		if (inp.KeyCode === Enum.KeyCode.Space) keys.jump = true;
	}
	if (inp.KeyCode === Enum.KeyCode.ButtonA) keys.padJump = true;
}));

track(inputService.InputChanged.Connect((inp) => {
	if (guiService.MenuIsOpen || inputService.GetFocusedTextBox()) return;
	if (inp.KeyCode === Enum.KeyCode.Thumbstick1) {
		keys.stick = new Vector2(inp.Position.X, -inp.Position.Y);
	}
}));

track(inputService.InputEnded.Connect((inp) => {
	if (lastInput && lastInput === inp && !settingsKeyListening && !guiService.MenuIsOpen && !inputService.GetFocusedTextBox()) {
		const click = inp.UserInputType === Enum.UserInputType.MouseButton1 && !lastWasGui && bindMatches(inp, config.flingKey);
		const tap = inp.UserInputType === Enum.UserInputType.Touch
			&& !lastWasGui
			&& os.clock() - lastTapTime < 0.3
			&& inp.Position.sub(lastTapPos).Magnitude < 10;

		if (click || tap) {
			tryFlingTap(inp.Position, inp.UserInputType === Enum.UserInputType.Touch);
		}
	}

	if (guiService.MenuIsOpen || inputService.GetFocusedTextBox()) return;
	if (inp.UserInputType === Enum.UserInputType.Keyboard) {
		if (inp.KeyCode === Enum.KeyCode.W || inp.KeyCode === Enum.KeyCode.Up) keys.w = false;
		if (inp.KeyCode === Enum.KeyCode.S || inp.KeyCode === Enum.KeyCode.Down) keys.s = false;
		if (inp.KeyCode === Enum.KeyCode.A) keys.a = false;
		if (inp.KeyCode === Enum.KeyCode.D) keys.d = false;
		if (inp.KeyCode === Enum.KeyCode.Space) keys.jump = false;
	}
	if (inp.KeyCode === Enum.KeyCode.ButtonA) keys.padJump = false;
	if (inp.KeyCode === Enum.KeyCode.Thumbstick1) keys.stick = Vector2.zero;
}));

track(inputService.TouchTap.Connect((touchPositions, gp) => {
	if (gp || guiService.MenuIsOpen || inputService.GetFocusedTextBox()) return;
	const pos = touchPositions[0];
	if (!pos) return;
	tryFlingTap(new Vector3(pos.X, pos.Y, 0), true);
}));

track(runService.Stepped.Connect(() => updateAntiFling()));

track(runService.PostSimulation.Connect(() => {
	const wanted = skidHoldCFrame;
	if (!wanted || method !== "skidfling" || queue[0] === undefined || !sessionModel) {
		skidHoldCFrame = undefined;
		return;
	}
	const char = localPlayer.Character;
	const [, rp] = charParts(char);
	if (!char || !rp) {
		skidHoldCFrame = undefined;
		return;
	}
	rp.CFrame = wanted;
	char.PivotTo(wanted);
}));

// render
runService.BindToRenderStep("nbf9000", Enum.RenderPriority.Last.Value, () => {
	updateGuide();
	updateHrpOutlines();
	if (sessionModel) maskChar(localPlayer.Character);
	if (config.clearInputOnMenu !== false && (guiService.MenuIsOpen || inputService.GetFocusedTextBox())) clearMove();
	else calcMove();
});

track(runService.PreAnimation.Connect(() => {
	const [sessionHum, sessionRoot] = charParts(sessionModel);
	if (!sessionModel || !sessionHum || !sessionRoot) return;
	cam = world.CurrentCamera;
	if (cam && cam.CameraSubject !== sessionHum) setCameraSubject(sessionHum);
	const cf = cam?.CFrame ?? sessionRoot.CFrame;
	const [, yaw] = cf.ToEulerAnglesYXZ();
	if (config.clearInputOnMenu !== false && inputService.GetFocusedTextBox()) clearMove();
	else calcMove();
	tickSessionSpawnAnchor();
	sessionHum.Move(CFrame.Angles(0, yaw, 0).VectorToWorldSpace(keys.move));
	sessionHum.Jump = keys.wantJump;
}));

function nextItem() {
	const now = os.clock();
	while (queue[0]) {
		const q = queue[0];
		if (!q.repeat && q.end !== undefined && now > q.end) {
			queue.shift();
			restoreTargetCollision();
		} else {
			return q;
		}
	}
}

function finishCurrentItem(sync: boolean) {
	const item = queue.shift();
	skidHoldCFrame = undefined;
	skidTweenLastClock = os.clock();
	restoreTargetCollision();
	if (item?.batch && queue[0]?.batch) {
		busy = true;
		return;
	}
	clearSessionModel(sync);
}

function skidTargetPart(tgt: Tgt) {
	if (!typeIs(tgt, "Instance")) return getPart(tgt);
	const char = tgt.IsA("Model") ? tgt : (tgt.IsA("BasePart") ? charFromPart(tgt) : undefined);
	if (!char) return getPart(tgt);
	const hum = char.FindFirstChildOfClass("Humanoid");
	const root = hum?.RootPart;
	const head = char.FindFirstChild("Head");
	let handle: BasePart | undefined;
	const accessory = char.FindFirstChildOfClass("Accessory");
	const accessoryHandle = accessory?.FindFirstChild("Handle");
	if (accessoryHandle?.IsA("BasePart")) handle = accessoryHandle;
	if (root?.IsA("BasePart")) return root;
	if (head?.IsA("BasePart")) return head;
	return handle ?? getPart(tgt);
}

function skidTargetCFrame(base: BasePart) {
	return new CFrame(base.Position.add(flingPredictionOffset(base, 0.14, 6)));
}

function flingPredictionOffset(base: BasePart, maxLead: number, maxHorizontal: number) {
	if (config.flingPrediction !== true) return Vector3.zero;
	const t = os.clock();
	const lead = math.clamp((math.sin(t * 15) + 1) * (maxLead * 0.5), 0, maxLead);
	const velocity = base.AssemblyLinearVelocity;
	let horizontal = new Vector3(velocity.X, 0, velocity.Z).mul(lead);
	if (horizontal.Magnitude > maxHorizontal) horizontal = horizontal.Unit.mul(maxHorizontal);
	const y = math.clamp(velocity.Y * lead - world.Gravity * 0.5 * lead * lead + math.sin(t * 60) * 0.08, -1, 1.25);
	return horizontal.add(new Vector3(0, y, 0));
}

function tweenSkidCFrame(wanted: CFrame) {
	const now = os.clock();
	const dt = math.clamp(now - skidTweenLastClock, 0, 1 / 15);
	skidTweenLastClock = now;
	const current = skidHoldCFrame;
	if (!current) return wanted;
	if (current.Position.sub(wanted.Position).Magnitude > 40) return wanted;
	const alpha = math.clamp(dt * 30, 0.24, 0.86);
	return current.Lerp(wanted, alpha);
}

function doFling(rp: BasePart, hum: Humanoid, tgt: Tgt, cf: CFrame) {
	const tp = getPart(tgt);
	const rep = flingPart(tgt) ?? tp;
	const t = os.clock();
	const orbit = new Vector3(math.sin(t * 95) * 0.12, math.cos(t * 83) * 0.08, math.cos(t * 101) * 0.12);

	if (method === "skidfling") {
		const base = skidTargetPart(tgt) ?? tp;
		if (base) {
			const wanted = tweenSkidCFrame(skidTargetCFrame(base));
			rp.CFrame = wanted;
			localPlayer.Character?.PivotTo(wanted);
			skidHoldCFrame = wanted;
			restoreAntiFlingCollision();
			enableSkidFlingCollision(localPlayer.Character);
		} else {
			skidHoldCFrame = undefined;
		}
		const huge = new Vector3(9e7, 9e8, 9e7);
		const spin = new Vector3(9e8, 9e8, 9e8);
		for (const obj of localPlayer.Character?.GetDescendants() ?? []) {
			if (obj.IsA("BasePart")) {
				obj.Velocity = huge;
				obj.RotVelocity = spin;
				obj.AssemblyLinearVelocity = huge;
				obj.AssemblyAngularVelocity = spin;
			}
		}
		hum.SetStateEnabled(Enum.HumanoidStateType.Seated, false);
		pcall(() => sethiddenproperty(hum, "MoveDirectionInternal", new Vector3(0 / 0, 0 / 0, 0 / 0)));
		pcall(() => sethiddenproperty(hum, "NetworkHumanoidState", Enum.HumanoidStateType.Freefall));
		return;
	}

	if (tp !== undefined) {
		pcall(() => sethiddenproperty(rp, "PhysicsRepRootPart", rep));
	}
	rp.CFrame = cf.add(orbit) as CFrame;
	rp.Velocity = Vector3.zero;
	rp.RotVelocity = Vector3.zero;
	rp.AssemblyLinearVelocity = Vector3.zero;
	rp.AssemblyAngularVelocity = Vector3.zero;

	pcall(() => sethiddenproperty(hum, "MoveDirectionInternal", new Vector3(0 / 0, 0 / 0, 0 / 0)));
	pcall(() => sethiddenproperty(hum, "NetworkHumanoidState", Enum.HumanoidStateType.Freefall));
}

// sim
track(runService.PreSimulation.Connect(() => {
	const char = localPlayer.Character;
	const [hum, rp] = charParts(char);
	if (!char || !hum || !rp) return;
	if (isDead(hum)) { dropDeadChar(char); return; }
	if (!queue[0] && !sessionModel) return;

	if (queue[0] && !sessionModel) spawnSessionModel();

	const [sessionHum, sessionRoot] = charParts(sessionModel);
	if (!sessionModel || !sessionHum || !sessionRoot) return;

	setFlingDestroyH();
	saveHumanoidState(hum);
	maskChar(char);
	hum.AutoRotate = false;
	hum.RequiresNeck = false;
	hum.BreakJointsOnDeath = false;
	if (hum.WalkSpeed < 1) hum.WalkSpeed = 16;
	if (hum.JumpPower < 1) hum.JumpPower = 50;
	hum.ChangeState(Enum.HumanoidStateType.Freefall);

	const item = nextItem();
	if (!item) { clearSessionModel(true); return; }
	if (shouldBackOff(item)) { finishCurrentItem(true); return; }

	const [cf, done] = predict(item.tgt, item);
	if (done) { finishCurrentItem(true); return; }

	busy = true;
	if (method !== "skidfling") noCollideTarget(item.tgt);
	doFling(rp, hum, item.tgt, cf);
}));

runtime.stop = stop;
runtime.fling = fling;
runtime.clear = resetRoot;
runtime.oldDestroyHeight = originalDestroyHeight;
runtime.sessionModel = sessionModel;
runtime.util = { predict, getPart };

env.nbf9000 = runtime;
bindCharacter(localPlayer.Character);
track(localPlayer.CharacterAdded.Connect((char) => {
	bindCharacter(char);
	task.defer(updateMobileTools);
}));
track(players.PlayerAdded.Connect(() => updateWatermark()));
track(players.PlayerRemoving.Connect(() => task.defer(updateWatermark)));
if (config.intro !== false) playIntro();
else task.defer(() => showSettingsMenu());
updateWatermark();
updateMobileTools();

// congrats you read all of it
