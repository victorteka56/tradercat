"use client";

import { useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import PieChartRoundedIcon from "@mui/icons-material/PieChartRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { signOut } from "@/app/auth/actions";

const DRAWER_WIDTH = 252;

const NAV = [
  { href: "/home", label: "Home", icon: <HomeRoundedIcon /> },
  { href: "/journal", label: "Journal", icon: <MenuBookRoundedIcon /> },
  { href: "/analytics", label: "Analytics", icon: <QueryStatsRoundedIcon /> },
  { href: "/portfolio", label: "Portfolio", icon: <PieChartRoundedIcon /> },
  { href: "/import", label: "Import", icon: <FileUploadRoundedIcon /> },
];

function Brand() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 2,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        T
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>
        TraderCat
      </Typography>
    </Box>
  );
}

export function AppShell({
  displayName,
  email,
  children,
}: {
  displayName: string | null;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const label = displayName || email.split("@")[0] || "Account";
  const initial = label.charAt(0).toUpperCase();

  const userBlock = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: 14, fontWeight: 700 }}>
        {initial}
      </Avatar>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography noWrap sx={{ fontSize: 11, color: "text.secondary" }}>
          {email}
        </Typography>
      </Box>
      <form action={signOut}>
        <Tooltip title="Sign out">
          <IconButton type="submit" size="small" sx={{ color: "text.secondary" }}>
            <LogoutRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </form>
    </Box>
  );

  const drawerInner = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ px: 2.5, py: 2.25 }}>
        <Brand />
      </Box>
      <Box sx={{ px: 1.5, flexGrow: 1, overflowY: "auto" }}>
        <List sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {NAV.map((item) => (
            <ListItem key={item.href} disablePadding>
              <ListItemButton
                component={NextLink}
                href={item.href}
                selected={isActive(item.href)}
                onClick={() => setMobileOpen(false)}
                sx={{ py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      <Divider />
      <Box sx={{ p: 1.75 }}>{userBlock}</Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Desktop sidebar — in flow */}
      <Box
        component="nav"
        sx={{
          display: { xs: "none", lg: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          borderRight: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ position: "sticky", top: 0, height: "100vh" }}>{drawerInner}</Box>
      </Box>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        {drawerInner}
      </Drawer>

      {/* Main column */}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile top bar */}
        <AppBar position="sticky" sx={{ display: { lg: "none" } }}>
          <Toolbar sx={{ gap: 1 }}>
            <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <MenuRoundedIcon />
            </IconButton>
            <Brand />
            <Box sx={{ flexGrow: 1 }} />
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 13, fontWeight: 700 }}>
              {initial}
            </Avatar>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
