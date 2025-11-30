import { useEffect, useMemo, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import { getDevices, getEvents, getDashboardStats } from "../../services/api";
import { Device, DeviceEvent } from "../../types";
import FiltersSection from "../Layout/FiltersSection";
import currency from "../../assets/icons/currency.svg";
import joystick from "../../assets/icons/joystick.svg";
import shape from "../../assets/icons/shape.svg";
import Warning from "../../assets/icons/Warning.svg";
import CustomSelect from "../Layout/CustomSelect";
import TailwindDatepicker from "../Alerts/DatePicker";
import search from "../../assets/icons/search.svg";
import MachineDetailsDrawer from "./MachineDetailsDrawer";

interface DashboardStats {
  totalRevenue: number;
  activeMachines: number;
  activeAlerts: number;
  livePlayers: number;
  revenueChange: number;
  machineChange: number;
  alertChange: number;
  playerChange: number;
}

interface AlertFilters {
  severity: string;
  eventType: string;
  deviceId: string;
  dateRange: string;
}

type GroupStats = {
  name: string;
  color: "green" | "orange" | "red";
  alerts: number;
  machines: number;
  uptime: number;
  revenue: number;
  critical: number;
  warning: number;
  maintenance: number;
  lat: number | null;
  lon: number | null;
};

const severityOptions = ["All Severities", "Critical", "High", "Medium", "Low"];

// Default center coordinates (New York as fallback)
const DEFAULT_CENTER = { lat: 35.2271, lng: -80.8431 };

function Dashboard() {
  const [filters, setFilters] = useState<AlertFilters>({
    severity: "all",
    eventType: "all",
    deviceId: "all",
    dateRange: "all",
  });
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    activeMachines: 0,
    activeAlerts: 0,
    livePlayers: 0,
    revenueChange: 0,
    machineChange: 0,
    alertChange: 0,
    playerChange: 0,
  });
  const [searchValue, setSearchValue] = useState("");
  const [severityValue, setSeverityValue] = useState("all");
  const [groupValue, setGroupValue] = useState("all");
  const [dateValue, setDateValue] = useState("this_month");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [zoomLevel, setZoomLevel] = useState(6);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const dateOptions = [
    "This Month",
    "Last Month",
    "Last 7 Days",
    "Last 30 Days"
  ];

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  // Events sorted newest-first
  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          new Date(b.event_timestamp).getTime() -
          new Date(a.event_timestamp).getTime()
      ),
    [events]
  );

  // Derive latest severity per device from events
  const severityByDevice = useMemo(() => {
    const result: Record<string, "normal" | "warning" | "critical"> = {};
    for (const ev of sortedEvents) {
      const key = ev.device_id || ev.imei || ev.serial_number;
      if (!key || result[key]) continue;
      if (ev.severity === "critical") result[key] = "critical";
      else if (ev.severity === "warning") result[key] = "warning";
      else result[key] = "normal";
    }
    return result;
  }, [sortedEvents]);

  const latestEventByDevice = useMemo(() => {
    const result: Record<string, DeviceEvent> = {};
    for (const ev of sortedEvents) {
      const key = ev.device_id || ev.imei || ev.serial_number;
      if (!key || result[key]) continue;
      result[key] = ev;
    }
    return result;
  }, [sortedEvents]);

  const severityCounts = useMemo(
    () => {
      const counts = { normal: 0, warning: 0, critical: 0 };
      for (const d of devices) {
        const key = d.device_id || d.imei || d.serial_number;
        const sev = key && severityByDevice[key] ? severityByDevice[key] : "normal";
        counts[sev] += 1;
      }
      return counts;
    },
    [devices, severityByDevice]
  );

  const deviceByKey = useMemo(() => {
    const map: Record<string, Device> = {};
    for (const d of devices) {
      if (d.device_id) map[d.device_id] = d;
      if (d.imei) map[d.imei] = d;
      if (d.serial_number) map[d.serial_number] = d;
    }
    return map;
  }, [devices]);

  // FIXED: Better map center calculation
  const mapCenter = useMemo(() => {
    const devicesWithCoords = devices.filter(
      (d) => d.lat !== undefined && d.lat !== null && d.lon !== undefined && d.lon !== null
    );

    if (devicesWithCoords.length === 0) {
      return DEFAULT_CENTER;
    }

    // Calculate average center of all devices
    const sum = devicesWithCoords.reduce(
      (acc, device) => {
        return {
          lat: acc.lat + Number(device.lat),
          lng: acc.lng + Number(device.lon),
        };
      },
      { lat: 0, lng: 0 }
    );

    return {
      lat: sum.lat / devicesWithCoords.length,
      lng: sum.lng / devicesWithCoords.length,
    };
  }, [devices]);

  // FIXED: Better group stats with coordinate validation
  const groupStats = useMemo<GroupStats[]>(() => {
    const groups = new Map<
      string,
      {
        devices: Device[];
        alerts: number;
        critical: number;
        warning: number;
        maintenance: number;
        online: number;
        revenue: number;
        latSum: number;
        lonSum: number;
        coordsCount: number;
      }
    >();

    const ensureGroup = (name: string) => {
      const key = name || "Ungrouped";
      if (!groups.has(key)) {
        groups.set(key, {
          devices: [],
          alerts: 0,
          critical: 0,
          warning: 0,
          maintenance: 0,
          online: 0,
          revenue: 0,
          latSum: 0,
          lonSum: 0,
          coordsCount: 0,
        });
      }
      return groups.get(key)!;
    };

    for (const d of devices) {
      const g = ensureGroup(d.group_name || "Ungrouped");
      g.devices.push(d);
      if (d.is_online) g.online += 1;

      // FIXED: Better coordinate validation
      const lat = typeof d.lat === 'number' ? d.lat : parseFloat(d.lat as any);
      const lon = typeof d.lon === 'number' ? d.lon : parseFloat(d.lon as any);

      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        g.latSum += lat;
        g.lonSum += lon;
        g.coordsCount += 1;
      }
    }

    for (const ev of events) {
      const key = ev.device_id || ev.imei || ev.serial_number;
      if (!key) continue;
      const dev = deviceByKey[key];
      const g = ensureGroup(dev?.group_name || "Ungrouped");
      g.alerts += 1;
      if (ev.severity === "critical") g.critical += 1;
      else if (ev.severity === "warning" || ev.severity === "high")
        g.warning += 1;
      if (ev.category === "maintenance") g.maintenance += 1;
      if (ev.is_financial_event && typeof ev.parsed_amount === "number") {
        g.revenue += ev.parsed_amount;
      }
    }

    const result: GroupStats[] = [];
    for (const [name, g] of groups.entries()) {
      const machines = g.devices.length;
      const uptime = machines ? (g.online / machines) * 100 : 0;

      let color: "green" | "orange" | "red" = "green";
      if (name === "Group A") color = "orange";
      else if (name === "Group B") color = "red";
      else if (name === "Group C") color = "green";
      else if (name === "Group D") color = "red";

      // FIXED: Better coordinate calculation with validation
      let lat: number | null = null;
      let lon: number | null = null;

      if (g.coordsCount > 0) {
        const avgLat = g.latSum / g.coordsCount;
        const avgLon = g.lonSum / g.coordsCount;

        if (!isNaN(avgLat) && !isNaN(avgLon) && avgLat >= -90 && avgLat <= 90 && avgLon >= -180 && avgLon <= 180) {
          lat = avgLat;
          lon = avgLon;
        }
      }

      result.push({
        name,
        color,
        alerts: g.alerts,
        machines,
        uptime,
        revenue: g.revenue,
        critical: g.critical,
        warning: g.warning,
        maintenance: g.maintenance,
        lat,
        lon,
      });
    }
    result.sort((a, b) => b.alerts - a.alerts);
    return result;
  }, [devices, events, deviceByKey]);

  const selectedGroupStats = useMemo(
    () =>
      selectedGroup
        ? groupStats.find((g) => g.name === selectedGroup) || null
        : null,
    [groupStats, selectedGroup]
  );

  const groupMarkerIcon = (g: GroupStats): google.maps.Symbol => {
    const fillColor =
      g.color === "red"
        ? "#FF3B30"
        : g.color === "orange"
          ? "#F59E0B"
          : "#22C55E";
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 22,
      fillColor,
      fillOpacity: 1,
      strokeColor: "#FFFFFF",
      strokeWeight: 3,
    };
  };

  // FIXED: Map load handler
  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;

    // Add zoom listener
    map.addListener('zoom_changed', () => {
      const newZoom = map.getZoom();
      if (newZoom !== undefined) {
        setZoomLevel(newZoom);
      }
    });

    // Fit bounds to show all markers
    if (groupStats.length > 0) {
      const bounds = new google.maps.LatLngBounds();

      groupStats.forEach((group) => {
        if (group.lat !== null && group.lon !== null) {
          bounds.extend(new google.maps.LatLng(group.lat, group.lon));
        }
      });

      // If we have valid bounds, fit the map to them
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);

        // Don't zoom too far out
        const zoom = map.getZoom();
        if (zoom && zoom < 8) {
          map.setZoom(8);
        }
      }
    }
  };

  const handleGroupClick = (groupName: string) => {
    const group = groupStats.find(g => g.name === groupName);
    if (group && mapRef.current) {
      // Find bounds for this group's devices
      const bounds = new google.maps.LatLngBounds();
      const groupDevices = devices.filter(d => d.group_name === groupName);

      let hasCoords = false;
      groupDevices.forEach(d => {
        if (d.lat && d.lon) {
          bounds.extend({ lat: Number(d.lat), lng: Number(d.lon) });
          hasCoords = true;
        }
      });

      if (hasCoords) {
        mapRef.current.fitBounds(bounds);
        // Ensure we zoom in enough to trigger device view if devices are close
        const listener = google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
          if (mapRef.current && mapRef.current.getZoom()! < 12) {
            mapRef.current.setZoom(12);
          }
        });
      }
    }
    setSelectedGroup(groupName);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devicesRes, eventsRes, statsRes] = await Promise.all([
          getDevices(),
          getEvents(),
          getDashboardStats({
            dateRange: dateValue,
            groupFilter: groupValue,
            severityFilter: severityValue
          })
        ]);

        const devicesData = devicesRes.devices || [];
        const eventsData = eventsRes.events || [];

        // FIXED: Log coordinates for debugging
        console.log("Devices with coordinates:", devicesData.filter((d: Device) => d.lat && d.lon));
        console.log("Map center will be:", mapCenter);

        setDevices(devicesData);
        setEvents(eventsData);
        setStats(statsRes);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [dateValue, groupValue, severityValue]);

  const uniqueGroups = useMemo(() => {
    const groups = devices
      .map((d) => d.group_name)
      .filter((g): g is string => !!g && g.trim() !== "");
    return Array.from(new Set(groups)).sort();
  }, [devices]);

  return (
    <div className="space-y-6">
      {/* Main Dashboard Cards - Your existing code remains the same */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 ">
        {/* Total Revenue Card */}
        <div className="bg-[#FEFEFE] border border-[#E6E6E6] rounded-lg p-4 shadow-[0px_11px_16px_0px_rgba(220,220,221,0.4)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between space-x-2 ">
              <h3 className="text-[16px] font-semibold text-[rgba(113,113,130,1)] leading-[100%] tracking-[-0.02em]">
                Total Revenue
              </h3>
              <span className="flex items-center justify-center text-[12px] font-medium text-[rgba(10,191,82,1)] bg-[rgba(239,253,244,1)] rounded-[8px] px-[10px] py-[4px]">
                +{stats.revenueChange}%
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <img src={currency} alt="" />
            </div>
          </div>

          <div className="flex items-center space-x-2 my-3">
            <div className="text-[22px] font-semibold text-[rgba(10,10,10,1)] leading-[100%] tracking-[-0.02em]  ">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(stats.totalRevenue)}
            </div>
            <div className="text-[14px] font-normal text-[rgba(113,113,130,1)]  ml-2">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
              }).format(stats.totalRevenue / (30 * 24))}
              /hr
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <CustomSelect
              options={dateOptions}
              value={dateValue === 'this_month' ? 'This Month' : dateValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              multiSelect={false}
              onChange={(val) => {
                const map: Record<string, string> = {
                  'This Month': 'this_month',
                  'Last Month': 'last_month',
                  'Last 7 Days': 'last_7_days',
                  'Last 30 Days': 'last_30_days'
                };
                const sel = Array.isArray(val) ? val[0] : val;
                setDateValue(map[sel] || 'this_month');
              }}
            />
          </div>
        </div>

        {/* Active Machines Card */}
        <div className="bg-[#FEFEFE] border border-[#E6E6E6] rounded-lg p-4 shadow-[0px_11px_16px_0px_rgba(220,220,221,0.4)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between space-x-2 ">
              <h3 className="text-[16px] font-semibold text-[rgba(113,113,130,1)] leading-[100%] tracking-[-0.02em]">
                Active Machines
              </h3>
              <span className=" flex items-center justify-center text-[12px] font-medium text-[rgba(10,191,82,1)] bg-[rgba(239,253,244,1)] rounded-[8px] px-[10px] py-[4px]">
                +{stats.machineChange}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <img src={joystick} alt="" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-[22px] font-semibold text-[rgba(10,10,10,1)] leading-[100%] tracking-[-0.02em] font-['DM_Sans'] align-middle my-3">
              {stats.activeMachines}
            </div>
            <div className="text-[14px] font-normal text-[rgba(113,113,130,1)]  ml-2">
              99.2% uptime
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-[12px] text-[rgba(10,10,10,1)] whitespace-nowrap">
                Time:
              </span>
              <CustomSelect
                options={dateOptions}
                value={dateValue === 'this_month' ? 'This Month' : dateValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                multiSelect={false}
                containerClassName="w-[100px]"
                buttonClassName="w-full px-1 py-0 border-none bg-transparent flex justify-between items-center outline-none text-[12px] font-semibold text-[rgba(10,10,10,1)]"
                onChange={(val) => {
                  const map: Record<string, string> = {
                    'This Month': 'this_month',
                    'Last Month': 'last_month',
                    'Last 7 Days': 'last_7_days',
                    'Last 30 Days': 'last_30_days'
                  };
                  const sel = Array.isArray(val) ? val[0] : val;
                  setDateValue(map[sel] || 'this_month');
                }}
              />
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-[12px] text-[rgba(10,10,10,1)] whitespace-nowrap">
                Group:
              </span>
              <CustomSelect
                options={uniqueGroups}
                value={groupValue === 'all' ? 'All' : groupValue}
                multiSelect={false}
                containerClassName="w-[80px]"
                buttonClassName="w-full px-1 py-0 border-none bg-transparent flex justify-between items-center outline-none text-[12px] font-semibold text-[rgba(10,10,10,1)]"
                onChange={(val) => {
                  const sel = Array.isArray(val) ? val[0] : val;
                  setGroupValue(sel);
                }}
              />
            </div>
          </div>
        </div>
        {/* Active Alerts Card */}
        <div className="bg-[#FEFEFE] border border-[#E6E6E6] rounded-lg p-4 shadow-[0px_11px_16px_0px_rgba(220,220,221,0.4)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between space-x-2 ">
              <h3 className="text-[16px] font-semibold text-[rgba(113,113,130,1)] leading-[100%] tracking-[-0.02em]">
                Active Alerts
              </h3>
              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                {stats.alertChange}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <img src={Warning} alt="" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-[22px] font-semibold text-[rgba(10,10,10,1)] leading-[100%] tracking-[-0.02em] font-['DM_Sans'] align-middle my-3">
              {stats.activeAlerts}
            </div>
            <div className="text-[14px] font-normal text-[rgba(113,113,130,1)]  ml-2">
              3 critical
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-[12px] text-[rgba(10,10,10,1)] whitespace-nowrap">
                Group:
              </span>
              <CustomSelect
                options={uniqueGroups}
                value={groupValue === 'all' ? 'All' : groupValue}
                multiSelect={false}
                containerClassName="w-[80px]"
                buttonClassName="w-full px-1 py-0 border-none bg-transparent flex justify-between items-center outline-none text-[12px] font-semibold text-[rgba(10,10,10,1)]"
                onChange={(val) => {
                  const sel = Array.isArray(val) ? val[0] : val;
                  setGroupValue(sel);
                }}
              />
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-[12px] text-[rgba(10,10,10,1)] whitespace-nowrap">
                Severity:
              </span>
              <CustomSelect
                options={severityOptions}
                value={severityValue === 'all' ? 'All Severities' : severityValue.charAt(0).toUpperCase() + severityValue.slice(1)}
                multiSelect={false}
                containerClassName="w-[100px]"
                buttonClassName="w-full px-1 py-0 border-none bg-transparent flex justify-between items-center outline-none text-[12px] font-semibold text-[rgba(10,10,10,1)]"
                onChange={(val) => {
                  const sel = Array.isArray(val) ? val[0] : val;
                  setSeverityValue(sel === 'All Severities' ? 'all' : sel.toLowerCase());
                }}
              />
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-[12px] text-[rgba(10,10,10,1)] whitespace-nowrap">
                Time:
              </span>
              <CustomSelect
                options={dateOptions}
                value={dateValue === 'this_month' ? 'This Month' : dateValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                multiSelect={false}
                containerClassName="w-[100px]"
                buttonClassName="w-full px-1 py-0 border-none bg-transparent flex justify-between items-center outline-none text-[12px] font-semibold text-[rgba(10,10,10,1)]"
                onChange={(val) => {
                  const map: Record<string, string> = {
                    'This Month': 'this_month',
                    'Last Month': 'last_month',
                    'Last 7 Days': 'last_7_days',
                    'Last 30 Days': 'last_30_days'
                  };
                  const sel = Array.isArray(val) ? val[0] : val;
                  setDateValue(map[sel] || 'this_month');
                }}
              />
            </div>
          </div>
        </div>
        {/* Live Players Card */}
        <div className="bg-[#FEFEFE] border border-[#E6E6E6] rounded-lg p-4 shadow-[0px_11px_16px_0px_rgba(220,220,221,0.4)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between space-x-2 ">
              <h3 className="text-[16px] font-semibold text-[rgba(113,113,130,1)] leading-[100%] tracking-[-0.02em] ">
                Live Players
              </h3>
              <span className=" flex items-center justify-center text-[12px] font-medium text-[rgba(10,191,82,1)] bg-[rgba(239,253,244,1)] rounded-[8px] px-[10px] py-[4px]">
                +{stats.machineChange}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <img src={shape} alt="" />
            </div>
          </div>
          <div className="flex items-center space-x-2 my-3">
            <div className="text-[22px] font-semibold text-[rgba(10,10,10,1)] leading-[100%] tracking-[-0.02em] font-['DM_Sans'] ">
              {stats.livePlayers.toLocaleString()}
            </div>
            <div className="text-[14px] font-normal text-[rgba(113,113,130,1)]  ml-2">
              +23 joins/min
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center rounded-lg border border-[rgba(230,230,230,1)] bg-[rgba(254,254,254,1)] p-5">
        <h3 className="text-[18px] font-medium leading-[100%] tracking-[-0.02em] text-gray-900">
          Filters & Search
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <TailwindDatepicker />
            <div className="relative w-[231px]">
              <img
                src={search}
                alt="search"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none"
              />
              <input
                type="text"
                placeholder="search by alerts"
                className="w-full h-[40px] pl-10 pr-4 py-2 rounded border border-[rgba(235,235,235,1)] bg-white outline-none focus:outline-none focus:ring-0 focus:border-[rgba(235,235,235,1)] text-sm"
              />
            </div>
          </div>
          <CustomSelect
            options={severityOptions}
            value={severityValue === 'all' ? 'All Severities' : severityValue.charAt(0).toUpperCase() + severityValue.slice(1)}
            multiSelect={false}
            onChange={(val) => {
              const sel = Array.isArray(val) ? val[0] : val;
              setSeverityValue(sel === 'All Severities' ? 'all' : sel.toLowerCase());
            }}
          />

          <CustomSelect
            options={uniqueGroups}
            value={groupValue === 'all' ? 'All Clusters' : groupValue}
            firstOption="All Clusters"
            multiSelect={false}
            onChange={(val) => {
              const sel = Array.isArray(val) ? val[0] : val;
              setGroupValue(sel === 'All Clusters' ? 'all' : sel);
            }}
          />
        </div>
      </div>

      {/* Gaming Machine Group Map Section - UPDATED */}
      <div className="bg-[#FEFEFE] border border-[#E6E6E6] rounded-lg p-6 shadow-[0px_11px_16px_0px_rgba(220,220,221,0.4)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-semibold text-[rgba(17,17,17,1)] leading-[100%] tracking-[-0.02em] font-['DM_Sans'] align-middle">
            Gaming Machine Group Map
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center ">
              <div className="w-3 h-3 bg-[rgba(52,199,89,1)] rounded-full"></div>
              <div className="ml-2">
                <span className="text-[16px] leading-[100%] tracking-[-0.02em] text-[rgba(28,32,36,1)]">
                  Normal
                </span>
                <p className="text-[14px] leading-[100%] tracking-[-0.02em] text-[rgba(28,32,36,1)] opacity-50">
                  {severityCounts.normal} devices
                </p>
              </div>
            </div>
            <div className="flex items-center ">
              <div className="w-3 h-3 bg-[rgba(245,158,12,1)] rounded-full"></div>
              <div className="ml-2">
                <span className="text-[16px] leading-[100%] tracking-[-0.02em] text-[rgba(28,32,36,1)]">
                  Warning
                </span>
                <p className="text-[14px] leading-[100%] tracking-[-0.02em] text-[rgba(28,32,36,1)] opacity-50">
                  {severityCounts.warning} devices
                </p>
              </div>
            </div>
            <div className="flex items-center ">
              <div className="w-3 h-3 bg-[rgba(255,0,0,1)] rounded-full"></div>
              <div className="ml-2">
                <span className="text-[16px] leading-[100%] tracking-[-0.02em] text-[rgba(28,32,36,1)]">
                  Critical
                </span>
                <p className="text-[14px] leading-[100%] tracking-[-0.02em] text-[rgba(28,32,36,1)] opacity-50">
                  {severityCounts.critical} devices
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-[171px]  bg-[rgba(244,244,245,1)] p-[4px] rounded-[12px]">
              <button
                onClick={() => setMapType('roadmap')}
                className={`px-[15px] h-[40px] text-[16px] font-normal rounded-[12px] transition-colors ${mapType === 'roadmap' ? 'bg-white text-[rgba(17,17,17,1)]' : 'bg-transparent text-[rgba(113,113,130,1)] hover:bg-white hover:text-[rgba(17,17,17,1)]'}`}
              >
                Map
              </button>
              <button
                onClick={() => setMapType('satellite')}
                className={`px-[15px] h-[40px] text-[16px] font-normal rounded-[12px] transition-colors ${mapType === 'satellite' ? 'bg-white text-[rgba(17,17,17,1)]' : 'bg-transparent text-[rgba(113,113,130,1)] hover:bg-white hover:text-[rgba(17,17,17,1)]'}`}
              >
                Satellite
              </button>
            </div>
          </div>
        </div>

        {/* Map with overlays */}
        <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
          {/* Search icon (top-left) */}
          <div className="absolute top-3 left-3 bg-white border border-gray-200 rounded-lg p-2 shadow-sm z-10">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {selectedGroupStats && (
            <div className="absolute top-16 left-3 bg-[rgba(254,254,254,1)] border border-[rgba(230,230,230,1)] rounded-[8px] shadow-[0px_11px_16px_0px_rgba(220,220,221,0.4)] p-[24px] min-w-[220px] z-10">
              <div className="flex items-center mb-3">
                <div
                  className={`w-3 h-3 rounded-full ${selectedGroupStats.color === "red"
                    ? "bg-red-500"
                    : selectedGroupStats.color === "orange"
                      ? "bg-yellow-400"
                      : "bg-green-500"
                    }`}
                ></div>
                <span className="ml-2 text-[16px] font-semibold text-[rgba(28,32,36,1)]">
                  {selectedGroupStats.name} Stats
                </span>
              </div>
              <div className="space-y-2 text-[14px] text-[rgba(28,32,36,1)]">
                <div className="flex justify-between">
                  <span>Machines:</span>
                  <span>{selectedGroupStats.machines}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span>{selectedGroupStats.uptime.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Revenue:</span>
                  <span>
                    {selectedGroupStats.revenue.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Legend (bottom-left) */}
          <div className="absolute bottom-3 z-10 left-3  bg-[rgba(254,254,254,1)] border border-[rgba(230,230,230,1)] rounded-[8px] shadow-[0px_11px_16px_0px_rgba(220,220,221,0.4)] p-[24px]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {groupStats.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => setSelectedGroup(g.name)}
                  className="flex items-center text-left"
                >
                  <span
                    className={`w-3 h-3 rounded-full ${g.color === "red"
                      ? "bg-red-500"
                      : g.color === "orange"
                        ? "bg-yellow-400"
                        : "bg-green-500"
                      }`}
                  ></span>
                  <div className="ml-4">
                    <span className="text-[16px] leading-[100%] tracking-[-0.02em] text-[rgba(28,32,36,1)]">
                      {g.name}
                    </span>
                    <p className="text-[14px] leading-[100%] tracking-[-0.02em] text-[rgba(28,32,36,1)] opacity-50">
                      {g.alerts} Alerts
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Google Map - UPDATED */}
          <div className="absolute inset-0">
            {!isLoaded ? (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={mapCenter}
                zoom={6}
                onLoad={onMapLoad}
                mapTypeId={mapType}
                options={{
                  disableDefaultUI: false,
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                }}
              >
                {/* Render Group Markers if Zoom < 12 */}
                {zoomLevel < 12 && groupStats.map((g) => (
                  g.lat && g.lon && (
                    <Marker
                      key={g.name}
                      position={{ lat: g.lat, lng: g.lon }}
                      icon={groupMarkerIcon(g)}
                      label={{
                        text: g.alerts.toString(),
                        color: "white",
                        fontSize: "14px",
                        fontWeight: "bold",
                      }}
                      onClick={() => handleGroupClick(g.name)}
                    />
                  )
                ))}

                {/* Render Individual Device Markers if Zoom >= 12 */}
                {zoomLevel >= 12 && devices.map((d) => {
                  if (!d.lat || !d.lon) return null;
                  const isOnline = d.is_online;
                  const hasCritical = severityByDevice[d.device_id] === 'critical';

                  // Determine color based on status/severity
                  let iconUrl = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
                  if (hasCritical) iconUrl = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
                  else if (!isOnline) iconUrl = 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'; // Or grey

                  return (
                    <Marker
                      key={d.device_id}
                      position={{ lat: Number(d.lat), lng: Number(d.lon) }}
                      icon={iconUrl}
                      onClick={() => setSelectedDevice(d)}
                    />
                  );
                })}

              </GoogleMap>
            )}
          </div>
        </div>

        {/* Machine Details Drawer */}
        {selectedDevice && (
          <MachineDetailsDrawer
            device={selectedDevice}
            onClose={() => setSelectedDevice(null)}
            events={events}
            onRestart={() => console.log("Restart", selectedDevice.device_id)}
            onEnable={() => console.log("Enable", selectedDevice.device_id)}
          />
        )}
      </div>
    </div>
  );
}

export default Dashboard;