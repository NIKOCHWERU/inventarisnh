import os from 'os';
import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  isWifiOrEthernet: boolean;
}

export function getLocalIpDetails(): NetworkInterfaceInfo[] {
  const interfaces = os.networkInterfaces();
  const list: NetworkInterfaceInfo[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        const isWifiOrEth =
          name.startsWith('wl') || // wlan, wlp
          name.startsWith('en') || // enp, eth
          name.startsWith('et') ||
          net.address.startsWith('192.168.') ||
          net.address.startsWith('10.');

        list.push({
          name,
          address: net.address,
          isWifiOrEthernet: isWifiOrEth,
        });
      }
    }
  }

  // Sort: Wi-Fi/Ethernet (192.168.x.x, 10.x.x.x) first, then others like Tailscale/VPN
  list.sort((a, b) => {
    if (a.isWifiOrEthernet && !b.isWifiOrEthernet) return -1;
    if (!a.isWifiOrEthernet && b.isWifiOrEthernet) return 1;
    if (a.address.startsWith('192.168.') && !b.address.startsWith('192.168.')) return -1;
    if (!a.address.startsWith('192.168.') && b.address.startsWith('192.168.')) return 1;
    return 0;
  });

  return list;
}

export function getLocalIpAddresses(): string[] {
  return getLocalIpDetails().map((i) => i.address);
}

export async function getActiveTunnelUrl(): Promise<string | null> {
  // 1. Check .tunnel_url file
  const tunnelFile = path.join(process.cwd(), '.tunnel_url');
  if (fs.existsSync(tunnelFile)) {
    try {
      const url = fs.readFileSync(tunnelFile, 'utf8').trim();
      if (url.startsWith('https://')) return url;
    } catch {}
  }

  // 2. Check database setting
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'tunnel_url' },
    });
    if (setting && setting.value.startsWith('https://')) {
      return setting.value;
    }
  } catch {}

  // 3. Check environment
  if (process.env.TUNNEL_URL && process.env.TUNNEL_URL.startsWith('https://')) {
    return process.env.TUNNEL_URL;
  }

  return null;
}

export async function getNetworkAccessInfo(requestHost?: string | null) {
  const ipDetails = getLocalIpDetails();
  const localIps = ipDetails.map((i) => i.address);
  const tunnelUrl = await getActiveTunnelUrl();
  const port = process.env.PORT || '3000';

  // Primary LAN IP (e.g. 192.168.1.100)
  const primaryLocalIp = localIps[0] || '127.0.0.1';
  const lanUrl = `http://${primaryLocalIp}:${port}`;
  const localhostUrl = `http://localhost:${port}`;

  let hostUrl: string | null = null;
  if (requestHost) {
    const isLocalhostHost =
      requestHost.includes('localhost') || requestHost.startsWith('127.0.0.1');
    if (!isLocalhostHost) {
      const protocol = requestHost.includes('https') ? 'https' : 'http';
      hostUrl = `${protocol}://${requestHost}`;
    }
  }

  const appUrl = process.env.APP_URL && !process.env.APP_URL.includes('localhost') ? process.env.APP_URL.replace(/\/$/, '') : null;

  // Preferred URL for QR code should NEVER be localhost!
  // Priority: Configured Production Domain (APP_URL) > Active Cloudflare Tunnel > Valid remote host header > Real Wi-Fi/LAN IP
  const preferredUrl = appUrl || tunnelUrl || hostUrl || lanUrl;

  return {
    localhostUrl,
    lanUrl,
    localIps,
    ipDetails,
    tunnelUrl,
    appUrl,
    preferredUrl,
  };
}
