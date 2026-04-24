declare function getgenv(): { nbf9000?: Runtime };
declare function sethiddenproperty(obj: Instance, prop: string, val: unknown): void;
declare function getcustomasset(path: string): string;
declare function getsynasset(path: string): string;
declare function isfile(path: string): boolean;
declare function readfile(path: string): string;
declare function writefile(path: string, data: string): void;
declare function makefolder(path: string): void;

type Method = "weld" | "tp";
type Tgt = Instance | CFrame | Vector3;

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

interface QueueItem {
	tgt: Tgt;
	dur?: number;
	end?: number;
	start?: number;
	startPos?: Vector3;
}

interface SavedHumanoidState {
	hum: Humanoid;
	autoRotate: boolean;
	walkSpeed: number;
	jumpPower: number;
	jumpHeight: number;
	useJumpPower: boolean;
}

const minIntroAssetBytes = 100000;

let method: Method = "weld"; // "weld" or "tp"


const anims = {
	R6: {
		idle: "rbxassetid://180435571",
		walk: "rbxassetid://180426354",
		run: "rbxassetid://180426354",
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

const oldRuntime = getgenv().nbf9000;
let oldStop: (() => void) | undefined;
let oldDestroyHeight = world.FallenPartsDestroyHeight;
if (oldRuntime) {
	oldStop = oldRuntime.stop;
	if (oldRuntime.oldDestroyHeight !== undefined) oldDestroyHeight = oldRuntime.oldDestroyHeight;
}
const originalDestroyHeight = oldDestroyHeight !== oldDestroyHeight ? -500 : oldDestroyHeight; // this is a really cursed way to check for NaN but it works and it's late
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
const savedTransparency = new Map<BasePart, number>();
const savedCollision = new Map<BasePart, boolean>();
const targetCollision = new Map<BasePart, boolean>();

let sessionModel: Model | undefined;
let guidePart: BasePart | undefined;
let guideOutline: SelectionBox | undefined;
let guideTick = os.clock();
let introGui: ScreenGui | undefined;
let introConn: RBXScriptConnection | undefined;
let introSound: Sound | undefined;
let savedHumanoidState: SavedHumanoidState | undefined;
let maskedChar: Model | undefined;
let deathConn: RBXScriptConnection | undefined;
let busy = false;
let lastInput: InputObject | undefined;
let lastWasGui = false;
let lastTapTime = 0;
let lastTapPos = Vector3.zero;

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

function accentColor(n: number) {
	const x = wrap(n) * 5;
	const i = math.floor(x);
	const a = x - i;
	if (i === 0) return Color3.fromRGB(122, 162, 247).Lerp(Color3.fromRGB(125, 207, 255), a);
	if (i === 1) return Color3.fromRGB(125, 207, 255).Lerp(Color3.fromRGB(187, 154, 247), a);
	if (i === 2) return Color3.fromRGB(187, 154, 247).Lerp(Color3.fromRGB(247, 118, 142), a);
	if (i === 3) return Color3.fromRGB(247, 118, 142).Lerp(Color3.fromRGB(224, 175, 104), a);
	return Color3.fromRGB(224, 175, 104).Lerp(Color3.fromRGB(122, 162, 247), a);
}

function accentSequence() {
	return new ColorSequence([
		new ColorSequenceKeypoint(0, Color3.fromRGB(122, 162, 247)),
		new ColorSequenceKeypoint(0.26, Color3.fromRGB(125, 207, 255)),
		new ColorSequenceKeypoint(0.52, Color3.fromRGB(187, 154, 247)),
		new ColorSequenceKeypoint(0.76, Color3.fromRGB(247, 118, 142)),
		new ColorSequenceKeypoint(1, Color3.fromRGB(224, 175, 104)),
	]);
}

function accentGradient(parent: GuiObject, rot = 0) {
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
	if (guidePart) guidePart.Destroy();
	guideOutline = undefined;
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
	label.TextColor3 = new Color3(1, 1, 1);
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
		if (readOk && typeIs(data, "string") && data.size() < minIntroAssetBytes) return;
		const [ok, id] = pcall(() => getcustomasset(path));
		if (ok && typeIs(id, "string") && id.size() > 0) return id;
		const [synOk, synId] = pcall(() => getsynasset(path));
		if (synOk && typeIs(synId, "string") && synId.size() > 0) return synId;
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
		const data = httpGet(game, "https://raw.githubusercontent.com/xaviersupreme/nanny-bean-flicker-9000/main/assets/nbf9000-intro.mp3");
		if (data.size() > minIntroAssetBytes) writefile(path, data);
	});

	const asset = customAsset(path);
	if (!asset) warn("nbf9000 intro sound missing: assets/nbf9000-intro.mp3 did not download or is not a valid mp3");
	return asset;
}

function playIntro() {
	killIntro();

	const pg = localPlayer.WaitForChild("PlayerGui") as PlayerGui;
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "nbf9000Intro";
	screenGui.IgnoreGuiInset = true;
	screenGui.ResetOnSpawn = false;
	screenGui.DisplayOrder = 2147483647;
	screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling;
	screenGui.Parent = pg;
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
	shade.BackgroundColor3 = Color3.fromRGB(4, 6, 14);
	shade.BackgroundTransparency = 0.18;
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
		frame.BackgroundTransparency = 0.18;
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
	card.BackgroundColor3 = Color3.fromRGB(22, 22, 33);
	card.BackgroundTransparency = 0.04;
	card.BorderSizePixel = 0;
	card.ClipsDescendants = true;
	card.ZIndex = 3;
	card.Parent = screenGui;

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
	stroke.Parent = card;

	const edge = new Instance("UIGradient");
	edge.Color = accentSequence();
	edge.Parent = stroke;

	const top = new Instance("Frame");
	top.Position = new UDim2(0, 0, 0, 0);
	top.Size = new UDim2(1, 0, 0, 18);
	top.BackgroundColor3 = Color3.fromRGB(15, 15, 24);
	top.BorderSizePixel = 0;
	top.ZIndex = 4;
	top.Parent = card;

	const title = makeIntroText(card, "NBF9000", 28, 45, true);
	const sub = makeIntroText(card, ":3 :3 :3 :3 :3 :3 :3", 13, 78);
	sub.TextTransparency = 0.12;
	const boot = makeIntroText(card, "ctrl+mb1 / tap player", 12, 100);
	boot.TextTransparency = 0.38;
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

	const start = os.clock();
	let lastBar = 0;
	let closing = false;
	introConn = runService.RenderStepped.Connect(() => {
		const t = os.clock() - start;
		const loud = introSound ? math.clamp(introSound.PlaybackLoudness / 650, 0, 1) : 0.35;
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
		boot.TextColor3 = Color3.fromRGB(170, 170, 176);
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
			flash.BackgroundTransparency = 0;
			shade.BackgroundTransparency = 1;
			for (const frame of borderFrames) frame.BackgroundTransparency = 1;
			card.BackgroundTransparency = 1;
			top.BackgroundTransparency = 1;
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
	const [hum, rp] = charParts(localPlayer.Character);
	if (isDead(hum)) { releaseGuide(); return; }
	const [, sessionRoot] = charParts(sessionModel);
	const root = busy ? rp : (sessionRoot ?? rp);
	if (!root) { clearGuide(); return; }

	const t = os.clock();
	const spin = CFrame.Angles(t * 90, t * 130, t * 70);
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

		p.Parent = world;
		guidePart = p;
		guideOutline = box;
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
}

function resetRoot() {
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
}

function restoreAlpha() {
	for (const [p, a] of savedTransparency) {
		if (p.Parent) p.LocalTransparencyModifier = a;
	}
	for (const [p, c] of savedCollision) {
		if (p.Parent) p.CanCollide = c;
	}
	savedTransparency.clear();
	savedCollision.clear();
	maskedChar = undefined;
}

function restoreTargetCollision() {
	for (const [p, c] of targetCollision) {
		if (p.Parent) p.CanCollide = c;
	}
	targetCollision.clear();
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

function maskChar(char?: Model) {
	if (!char) return;
	if (maskedChar === char) return;
	maskedChar = char;
	for (const obj of char.GetDescendants()) {
		if (obj.IsA("BasePart")) {
			if (!savedTransparency.has(obj)) savedTransparency.set(obj, obj.LocalTransparencyModifier);
			if (!savedCollision.has(obj)) savedCollision.set(obj, obj.CanCollide);
			obj.LocalTransparencyModifier = 1;
			obj.CanCollide = false;
			obj.Velocity = Vector3.zero;
			obj.RotVelocity = Vector3.zero;
		}
	}
}

function clearSessionModel(sync: boolean) {
	const model = sessionModel;
	const [, sessionRoot] = charParts(model);
	const [hum, rp] = charParts(localPlayer.Character);
	const retCf = sync && sessionRoot ? sessionRoot.CFrame : undefined;
	const retVel = sync && sessionRoot ? sessionRoot.AssemblyLinearVelocity : Vector3.zero;

	busy = false;

	if (model) model.Destroy();
	sessionModel = undefined;
	runtime.sessionModel = undefined;
	restoreTargetCollision();
	restoreAlpha();
	resetRoot();
	restoreHumanoidState();
	if (retCf && rp) {
		rp.CFrame = retCf;
		rp.AssemblyLinearVelocity = retVel;
		rp.AssemblyAngularVelocity = Vector3.zero;
		rp.Velocity = retVel;
		rp.RotVelocity = Vector3.zero;
	}
	setDestroyH(originalDestroyHeight);
	destroyHeightSet = false;

	if (hum && cam) cam.CameraSubject = hum;
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
	clearGuide();
	killIntro();
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
		if (obj.IsA("Script") || obj.IsA("LocalScript") || obj.IsA("Animator")) {
			obj.Destroy();
		} else if (obj.IsA("Motor6D")) {
			obj.Transform = CFrame.identity;
		} else if (obj.IsA("BasePart")) {
			obj.Anchored = false;
			obj.CanTouch = false;
			obj.CanQuery = false;
			obj.CanCollide = obj.Name === "HumanoidRootPart";
			obj.LocalTransparencyModifier = 0;
		} else if (obj.IsA("ForceField")) {
			obj.Visible = false;
		}
	}
}

function createTrack(anim: Animator, id: string, pri: Enum.AnimationPriority, loop: boolean) {
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

function animNodeId(node: Instance | undefined, fallback: string) {
	if (node?.IsA("Animation")) {
		return node.AnimationId.size() > 0 ? node.AnimationId : fallback;
	}
	if (node) {
		for (const child of node.GetChildren()) {
			if (child.IsA("Animation") && child.AnimationId.size() > 0) return child.AnimationId;
		}
	}
	return fallback;
}

function resolveAnimSet(char: Model | undefined, rig: Enum.HumanoidRigType) {
	const fallback = rig === Enum.HumanoidRigType.R15 ? anims.R15 : anims.R6;
	const animate = char?.FindFirstChild("Animate");
	if (!animate) return fallback;
	return {
		idle: animNodeId(animate.FindFirstChild("idle"), fallback.idle),
		walk: animNodeId(animate.FindFirstChild("walk"), fallback.walk),
		run: animNodeId(animate.FindFirstChild("run"), fallback.run),
		jump: animNodeId(animate.FindFirstChild("jump"), fallback.jump),
		fall: animNodeId(animate.FindFirstChild("fall"), fallback.fall),
	};
}

function animateSessionModel(char: Model, hum: Humanoid, sourceChar?: Model) {
	const anim = new Instance("Animator");
	anim.Parent = hum;

	const set = resolveAnimSet(sourceChar, hum.RigType);
	const tracks = {
		idle: createTrack(anim, set.idle, Enum.AnimationPriority.Idle, true),
		walk: createTrack(anim, set.walk, Enum.AnimationPriority.Movement, true),
		run: createTrack(anim, set.run, Enum.AnimationPriority.Movement, true),
		jump: createTrack(anim, set.jump, Enum.AnimationPriority.Action, false),
		fall: createTrack(anim, set.fall, Enum.AnimationPriority.Action, true),
	};

	let currentTrack: keyof typeof tracks | undefined;
	function play(name: keyof typeof tracks, fade: number) {
		if (currentTrack === name) return;
		if (currentTrack && tracks[currentTrack]) tracks[currentTrack]!.Stop(fade);
		currentTrack = name;
		tracks[name]?.Play(fade);
	}

	function playMove() {
		const speed = hum.WalkSpeed * math.min(keys.move.Magnitude, 1);
		const name = speed > 10 && tracks.run ? "run" : "walk";
		play(name, 0.15);
		tracks[name]?.AdjustSpeed(math.max(speed / 16, 0.1));
	}

	let cn: RBXScriptConnection;
	cn = runService.PreAnimation.Connect(() => {
		if (!sessionModel || !sessionModel.Parent || !hum.Parent) { cn.Disconnect(); return; }
		const st = hum.GetState();
		if (busy) {
			if (keys.move.Magnitude > 0.05) {
				playMove();
			} else play("idle", 0.2);
		} else if (st === Enum.HumanoidStateType.Jumping) {
			play("jump", 0.1);
		} else if (st === Enum.HumanoidStateType.Freefall || st === Enum.HumanoidStateType.FallingDown) {
			play("fall", 0.2);
		} else if (keys.move.Magnitude > 0.05) {
			playMove();
		} else play("idle", 0.2);
	});

	char.Destroying.Once(() => {
		cn.Disconnect();
		for (const [, t] of pairs(tracks)) {
			if (t) { t.Stop(0); t.Destroy(); }
		}
	});
}

function spawnSessionModel() {
	const char = localPlayer.Character;
	const [, rp] = charParts(char);
	if (!char || !rp) return;

	if (sessionModel) sessionModel.Destroy();

	const arc = char.Archivable;
	char.Archivable = true;
	const g = char.Clone();
	char.Archivable = arc;
	if (!g) return;

	g.Name = "nbf9000Rig";
	prepareSessionModel(g);
	g.Parent = world;
	g.PivotTo(rp.CFrame);

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

	sessionModel = g;
	runtime.sessionModel = g;
	animateSessionModel(g, sessionHum, char);

	if (cam) cam.CameraSubject = sessionHum;
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

function predict(tgt: Tgt): LuaTuple<[CFrame, boolean]> {
	if (typeIs(tgt, "Instance")) {
		const part = flingPart(tgt);
		if (part) {
			if (!part.IsDescendantOf(world)) return $tuple(CFrame.identity, true);

			const t = os.clock();
			const lead = method === "weld" ? 0.045 : 0.08 + math.sin(t * 15) * 0.02;
			let cf = new CFrame(part.Position);

			const oldPos = part.GetAttribute("lastPosition");
			if (typeIs(oldPos, "Vector3") && part.Position.sub(oldPos).Magnitude > 200) {
				part.SetAttribute("lastPosition", undefined);
				return $tuple(cf, true);
			}
			part.SetAttribute("lastPosition", part.Position);

			cf = cf.add(part.AssemblyLinearVelocity.mul(lead));
			if (method !== "weld") {
				cf = cf.add(new Vector3(0, -world.Gravity * 0.5 * lead * lead + math.sin(t * 60), 0));
				if (cf.Position.Y < part.Position.Y - 1) {
					cf = cf.Rotation.add(new Vector3(cf.Position.X, part.Position.Y - 1, cf.Position.Z));
				}
			}

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

	if (now > item.end) return true;

	const part = getPart(item.tgt);
	if (!part) return false;
	if (!part.IsDescendantOf(world)) return true;

	item.startPos = item.startPos ?? part.Position;
	if (now - item.start < 0.12) return false;

	const velocity = part.AssemblyLinearVelocity;
	if (velocity.Magnitude > 85 || math.abs(velocity.Y) > 60) return true;
	if (part.Position.sub(item.startPos).Magnitude > 35) return true;

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

function doHighlight(tgt: Tgt) {
	if (!typeIs(tgt, "Instance")) return;
	const char = tgt.IsA("Model") ? tgt : (tgt.IsA("BasePart") ? charFromPart(tgt) : undefined);
	if (!char) return;
	const hl = new Instance("Highlight");
	hl.Adornee = char;
	hl.FillColor = new Color3(1, 0, 0);
	hl.OutlineColor = new Color3(1, 0, 0);
	hl.FillTransparency = 0.5;
	hl.OutlineTransparency = 0;
	hl.Parent = tgt;
	tweenService.Create(hl, new TweenInfo(5), { FillTransparency: 1, OutlineTransparency: 1 }).Play();
	debrisService.AddItem(hl, 5);
}

function fling(tgt: Tgt, dur?: number) {
	if (!tgt) return false;
	for (const q of queue) { if (q.tgt === tgt) return false; }
	if (tgt === sessionModel || tgt === localPlayer.Character) return false;
	if (typeIs(tgt, "Instance")) {
		if (localPlayer.Character && tgt.IsDescendantOf(localPlayer.Character)) return false;
		if (sessionModel && tgt.IsDescendantOf(sessionModel)) return false;
	}

	if (typeIs(tgt, "Instance")) {
		if (cooldowns.has(tgt)) return;
		cooldowns.add(tgt);
		task.delay(1, () => cooldowns.delete(tgt));
	}

	queue.push({ tgt, dur });
	busy = true;
	doHighlight(tgt);
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
	return hit && charFromPart(hit.Instance) ? hit.Instance : undefined;
}

function clicked(pos: Vector3, touchFirst: boolean) {
	if (touchFirst) {
		const t = rayTarget(pos);
		if (t) return t;
	}
	return mouse.Target && charFromPart(mouse.Target) ? mouse.Target : rayTarget(pos);
}

function tryFlingTap(pos: Vector3, touchFirst: boolean) {
	const t = clicked(pos, touchFirst);
	if (t && fling(t) && !sessionModel) spawnSessionModel();
}

function ctrlDown() {
	return inputService.IsKeyDown(Enum.KeyCode.LeftControl)
		|| inputService.IsKeyDown(Enum.KeyCode.RightControl)
		|| inputService.IsKeyDown(Enum.KeyCode.LeftMeta)
		|| inputService.IsKeyDown(Enum.KeyCode.RightMeta)
		|| inputService.IsKeyDown(Enum.KeyCode.LeftSuper)
		|| inputService.IsKeyDown(Enum.KeyCode.RightSuper);
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
	if (guiService.MenuIsOpen || inputService.GetFocusedTextBox()) return;
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
	if (lastInput && lastInput === inp && !guiService.MenuIsOpen && !inputService.GetFocusedTextBox()) {
		const click = inp.UserInputType === Enum.UserInputType.MouseButton1 && !lastWasGui && ctrlDown();
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

// render
runService.BindToRenderStep("nbf9000", Enum.RenderPriority.Input.Value + 1, () => {
	updateGuide();
	if (inputService.GetFocusedTextBox()) clearMove();
	else calcMove();
});

track(runService.PreAnimation.Connect(() => {
	const [sessionHum, sessionRoot] = charParts(sessionModel);
	if (!sessionModel || !sessionHum || !sessionRoot) return;
	cam = world.CurrentCamera;
	if (cam && cam.CameraSubject !== sessionHum) cam.CameraSubject = sessionHum;
	const cf = cam?.CFrame ?? sessionRoot.CFrame;
	const [, yaw] = cf.ToEulerAnglesYXZ();
	sessionHum.Move(CFrame.Angles(0, yaw, 0).VectorToWorldSpace(keys.move));
	sessionHum.Jump = keys.wantJump;
}));

function nextItem() {
	const now = os.clock();
	while (queue[0]) {
		const q = queue[0];
		if (q.end !== undefined && now > q.end) {
			queue.shift();
			restoreTargetCollision();
		} else {
			return q;
		}
	}
}

function doFling(rp: BasePart, hum: Humanoid, tgt: Tgt, cf: CFrame) {
	const tp = getPart(tgt);
	const rep = flingPart(tgt) ?? tp;
	const useWeld = method === "weld" && tp !== undefined;

	if (!rp.IsGrounded()) {
		if (useWeld) {
			pcall(() => sethiddenproperty(rp, "PhysicsRepRootPart", rep));
			rp.CFrame = cf.add(new Vector3(0, 0, math.random(0, 1) * 0.005)) as CFrame;
		} else {
			rp.CFrame = new CFrame(cf.Position.add(new Vector3(0, 0, math.random(0, 1) * 0.005))).mul(CFrame.Angles(0, os.clock() * 15, 0)) as CFrame;
			pcall(() => sethiddenproperty(rp, "PhysicsRepRootPart", rep));
		}
		rp.Velocity = Vector3.zero;
		rp.RotVelocity = Vector3.zero;
		rp.AssemblyLinearVelocity = Vector3.zero;
		rp.AssemblyAngularVelocity = Vector3.zero;
	}

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
	saveHumanoidState(hum);
	hum.AutoRotate = false;
	if (hum.WalkSpeed < 1) hum.WalkSpeed = 16;
	if (hum.JumpPower < 1) hum.JumpPower = 50;
	hum.ChangeState(Enum.HumanoidStateType.Freefall);

	const item = nextItem();
	if (!item) { clearSessionModel(true); return; }
	if (shouldBackOff(item)) { queue.shift(); clearSessionModel(true); return; }

	const [cf, done] = predict(item.tgt);
	if (done) { queue.shift(); clearSessionModel(true); return; }

	busy = true;
	noCollideTarget(item.tgt);
	doFling(rp, hum, item.tgt, cf);
}));

runtime.stop = stop;
runtime.fling = fling;
runtime.clear = resetRoot;
runtime.oldDestroyHeight = originalDestroyHeight;
runtime.sessionModel = sessionModel;
runtime.util = { predict, getPart };

getgenv().nbf9000 = runtime;
bindCharacter(localPlayer.Character);
track(localPlayer.CharacterAdded.Connect((char) => bindCharacter(char)));
playIntro();

// congrats you read all of it
