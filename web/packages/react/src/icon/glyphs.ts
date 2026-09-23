/**
 * The Phosphor component that draws each registry id (ADR-0013 decision 2): the web binding of
 * spec/icons/registry.json, which src/generated/icons.ts names as `iconRegistry[id].component`.
 *
 * Each glyph is imported from its own module of `@phosphor-icons/react` rather than from the package
 * root, which would load all of Phosphor's icons wherever one is used. test/glyph.test.ts checks that
 * this map covers the registry, id for id, with the component the registry names; a registry change
 * that adds an id fails there until the id is added here.
 */
import type { Icon } from "@phosphor-icons/react";
import type { IconName } from "../generated/icons.ts";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { ArrowsInSimpleIcon } from "@phosphor-icons/react/dist/csr/ArrowsInSimple";
import { CopyIcon } from "@phosphor-icons/react/dist/csr/Copy";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { ArrowsOutSimpleIcon } from "@phosphor-icons/react/dist/csr/ArrowsOutSimple";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { CrosshairIcon } from "@phosphor-icons/react/dist/csr/Crosshair";
import { PauseIcon } from "@phosphor-icons/react/dist/csr/Pause";
import { PlayIcon } from "@phosphor-icons/react/dist/csr/Play";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { MinusIcon } from "@phosphor-icons/react/dist/csr/Minus";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { ShareNetworkIcon } from "@phosphor-icons/react/dist/csr/ShareNetwork";
import { MagnifyingGlassPlusIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlassPlus";
import { MagnifyingGlassMinusIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlassMinus";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { HouseIcon } from "@phosphor-icons/react/dist/csr/House";
import { ListIcon } from "@phosphor-icons/react/dist/csr/List";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/csr/DotsThree";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import { SidebarSimpleIcon } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { CaretUpIcon } from "@phosphor-icons/react/dist/csr/CaretUp";
import { BusIcon } from "@phosphor-icons/react/dist/csr/Bus";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CameraIcon } from "@phosphor-icons/react/dist/csr/Camera";
import { ChartLineIcon } from "@phosphor-icons/react/dist/csr/ChartLine";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { FileIcon } from "@phosphor-icons/react/dist/csr/File";
import { EyeIcon } from "@phosphor-icons/react/dist/csr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/csr/EyeSlash";
import { BroadcastIcon } from "@phosphor-icons/react/dist/csr/Broadcast";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/csr/LockSimple";
import { MapTrifoldIcon } from "@phosphor-icons/react/dist/csr/MapTrifold";
import { MapPinSimpleIcon } from "@phosphor-icons/react/dist/csr/MapPinSimple";
import { BellIcon } from "@phosphor-icons/react/dist/csr/Bell";
import { WifiHighIcon } from "@phosphor-icons/react/dist/csr/WifiHigh";
import { SparkleIcon } from "@phosphor-icons/react/dist/csr/Sparkle";
import { UserIcon } from "@phosphor-icons/react/dist/csr/User";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { TrendDownIcon } from "@phosphor-icons/react/dist/csr/TrendDown";
import { TrendUpIcon } from "@phosphor-icons/react/dist/csr/TrendUp";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";

export const glyphs: Readonly<Record<IconName, Icon>> = {
  "action.add": PlusIcon,
  "action.collapse": ArrowsInSimpleIcon,
  "action.copy": CopyIcon,
  "action.delete": TrashIcon,
  "action.edit": PencilSimpleIcon,
  "action.expand": ArrowsOutSimpleIcon,
  "action.filter": SlidersHorizontalIcon,
  "action.locate": CrosshairIcon,
  "action.pause": PauseIcon,
  "action.play": PlayIcon,
  "action.refresh": ArrowsClockwiseIcon,
  "action.remove": MinusIcon,
  "action.search": MagnifyingGlassIcon,
  "action.settings": GearSixIcon,
  "action.share": ShareNetworkIcon,
  "action.zoom-in": MagnifyingGlassPlusIcon,
  "action.zoom-out": MagnifyingGlassMinusIcon,
  "nav.back": CaretLeftIcon,
  "nav.close": XIcon,
  "nav.down": CaretDownIcon,
  "nav.forward": CaretRightIcon,
  "nav.home": HouseIcon,
  "nav.menu": ListIcon,
  "nav.more": DotsThreeIcon,
  "nav.open": ArrowUpRightIcon,
  "nav.sidebar": SidebarSimpleIcon,
  "nav.up": CaretUpIcon,
  "object.bus": BusIcon,
  "object.calendar": CalendarBlankIcon,
  "object.camera": CameraIcon,
  "object.chart": ChartLineIcon,
  "object.clock": ClockIcon,
  "object.document": FileIcon,
  "object.eye": EyeIcon,
  "object.eye-off": EyeSlashIcon,
  "object.gps": BroadcastIcon,
  "object.lock": LockSimpleIcon,
  "object.map": MapTrifoldIcon,
  "object.map-pin": MapPinSimpleIcon,
  "object.notification": BellIcon,
  "object.signal": WifiHighIcon,
  "object.sparkle": SparkleIcon,
  "object.user": UserIcon,
  "status.check": CheckIcon,
  "status.danger": XCircleIcon,
  "status.info": InfoIcon,
  "status.online": CircleIcon,
  "status.success": CheckCircleIcon,
  "status.trend-down": TrendDownIcon,
  "status.trend-up": TrendUpIcon,
  "status.warning": WarningIcon,
};
