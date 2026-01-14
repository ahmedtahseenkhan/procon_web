import { Device, DeviceEvent, DeviceGroup } from "../../types";
import { useEffect, useMemo, useState } from "react";
import { getGroups } from "../../services/api";
import joystick from "../../assets/icons/joystick.svg";
import thermometer from "../../assets/icons/thermometer.svg";
import warning from "../../assets/icons/warning.svg";

interface MachineDetailsDrawerProps {
    device: Device;
    onClose: () => void;
    onRestart?: () => void;
    onEnable?: () => void;
    events?: DeviceEvent[];
}

export default function MachineDetailsDrawer({
    device,
    onClose,
    onRestart,
    onEnable,
    events = [],
}: MachineDetailsDrawerProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [groups, setGroups] = useState<DeviceGroup[]>([]);

    useEffect(() => {
        // Trigger animation
        requestAnimationFrame(() => setIsVisible(true));
        getGroups().then((res) => setGroups(res || [])).catch(console.error);
    }, []);

    const groupNameById = useMemo(() => {
        const map: Record<string, string> = {};
        for (const g of groups) map[g.group_id] = g.name;
        return map;
    }, [groups]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
    };

    // Filter events for this device if passed all events, or assume passed events are already filtered
    const deviceEvents = events.filter(
        (e) =>
            e.device_id === device.device_id ||
            e.imei === device.imei ||
            e.serial_number === device.serial_number
    ).slice(0, 5); // Show last 5

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black transition-opacity duration-300 ${isVisible ? "bg-opacity-25" : "bg-opacity-0"
                    }`}
                onClick={handleClose}
            />

            {/* Drawer */}
            <div
                className={`relative w-full max-w-md bg-white h-full shadow-xl transform transition-transform duration-300 flex flex-col ${isVisible ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Machine Details – {device.nickname || device.device_id}
                        </h2>
                        <p className="text-sm text-gray-500">{device.serial_number}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Device Info Card */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <h3 className="text-sm font-medium text-gray-900">
                            Device Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500 block">Name</span>
                                <span className="font-medium text-gray-900">
                                    {device.nickname || "N/A"}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Serial Number</span>
                                <span className="font-medium text-gray-900">
                                    {device.serial_number}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Reference</span>
                                <span className="font-medium text-gray-900">
                                    {device.imei}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Group</span>
                                <span className="font-medium text-gray-900">
                                    {(device.group_id && groupNameById[device.group_id]) || "Ungrouped"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Status Information */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3">
                            Status Information
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500">Status</span>
                                <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${device.is_online
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                        }`}
                                >
                                    {device.is_online ? "ONLINE" : "OFFLINE"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500">Uptime</span>
                                <span className="text-sm font-medium text-gray-900">98.5%</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500">Temperature</span>
                                <div className="flex items-center text-orange-500">
                                    <img src={thermometer} className="w-4 h-4 mr-1" alt="temp" />
                                    <span className="text-sm font-medium">72°F</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500">Network</span>
                                <span className="text-sm font-medium text-green-600">
                                    Connected
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Location & Revenue */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <span className="text-xs text-blue-600 font-medium uppercase">Revenue (24h)</span>
                            <div className="text-lg font-bold text-blue-900 mt-1">$8,500</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <span className="text-xs text-gray-500 font-medium uppercase">Location</span>
                            <div className="text-xs text-gray-900 mt-1 truncate" title={device.full_address}>
                                {device.full_address || `${device.lat?.toFixed(4)}, ${device.lon?.toFixed(4)}`}
                            </div>
                        </div>
                    </div>

                    {/* Recent Events */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3">
                            Recent Events
                        </h3>
                        <div className="space-y-3">
                            {deviceEvents.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No recent events</p>
                            ) : (
                                deviceEvents.map((ev) => (
                                    <div
                                        key={ev.event_uuid}
                                        className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">
                                                    {new Date(ev.event_timestamp).toLocaleString()}
                                                </p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {ev.event_type.replace(/_/g, " ")}
                                                </p>
                                            </div>
                                            {ev.severity === "critical" && (
                                                <img src={warning} className="w-4 h-4" alt="critical" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50">
                    <div className="flex gap-3">
                        <button
                            onClick={onRestart}
                            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Restart Machine
                        </button>
                        <button
                            onClick={onEnable}
                            className="flex-1 px-4 py-2 bg-[#10B981] text-white rounded-lg text-sm font-medium hover:bg-[#059669] transition-colors"
                        >
                            Enable
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
