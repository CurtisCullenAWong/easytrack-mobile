"use client";

import { useState, useContext, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Box, Divider, List, ListItemButton, ListItemIcon, ListItemText, Collapse, Button, IconButton, useMediaQuery, Typography } from "@mui/material";
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PaymentIcon from '@mui/icons-material/Payment';
import InventoryIcon from '@mui/icons-material/Inventory';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ArticleIcon from '@mui/icons-material/Article';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BarChartIcon from '@mui/icons-material/BarChart';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import { ColorModeContext } from "../../layout";
import { useTheme } from "@mui/material/styles";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Page() {
    // State and context setup
    const [openPages, setOpenPages] = useState(() => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('contractorSidebarTransactionsOpen') || 'false') : false);
    const [isMinimized, setIsMinimized] = useState(true);
    const { mode, toggleMode } = useContext(ColorModeContext);
    const theme = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClientComponentClient();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            const sidebar = document.querySelector('[data-sidebar]');
            if (!sidebar?.contains(event.target)) setIsMinimized(true);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Save state to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') localStorage.setItem('contractorSidebarTransactionsOpen', JSON.stringify(openPages));
    }, [openPages]);

    // Navigation and auth handlers
    const handleClickPages = () => isMinimized ? setIsMinimized(false) : setOpenPages(!openPages);
    const handleNavigation = (route) => { router.push(route); setIsMinimized(true); };
    const isActive = (route) => pathname === route;
    const isDropdownActive = () => openPages;

    // Auth handlers
    const handleLogout = async () => {
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
            Object.keys(localStorage).filter(key => key.startsWith('sb-') && key.endsWith('-auth-token')).forEach(key => localStorage.removeItem(key));
            sessionStorage.clear();
        }
        router.push("/contractor/login");
    };

    // Styles
    const activeStyles = { backgroundColor: mode === "light" ? "#f0f0f0" : "#333", color: theme.palette.primary.main, borderRadius: 1 };
    const sidebarStyles = { width: isMinimized ? "64px" : "280px", height: "100vh", bgcolor: "background.paper", display: "flex", flexDirection: "column", borderRight: "1px solid", borderColor: "divider", position: "fixed", dataSidebar: true, overflowY: 'auto', overflowX: 'hidden', transition: theme.transitions.create('width', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.enteringScreen }), zIndex: 1200, '&::-webkit-scrollbar': { width: '8px', height: '0px' }, '&::-webkit-scrollbar-track': { background: 'transparent' }, '&::-webkit-scrollbar-thumb': { background: theme.palette.mode === 'light' ? '#ccc' : '#555', borderRadius: '4px' } };
    const headerStyles = { p: 1, display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "80px", position: "relative" };
    const logoStyles = { height: 50, width: "auto", cursor: "pointer", display: isMinimized ? "none" : "block", flex: 1, objectFit: "contain" };
    const menuButtonStyles = { position: isMinimized ? "absolute" : "static", right: isMinimized ? "50%" : "auto", transform: isMinimized ? "translateX(50%)" : "none", top: isMinimized ? 25 : "auto" };
    const listItemStyles = (route) => ({ ...(isActive(route) ? activeStyles : {}), minHeight: 48, px: isMinimized ? 0 : 2, justifyContent: isMinimized ? 'center' : 'flex-start', '& .MuiListItemIcon-root': { minWidth: isMinimized ? 'auto' : 40, justifyContent: 'center' }, '& .MuiListItemText-root': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', '& .MuiTypography-root': { fontSize: '0.875rem', lineHeight: 1.2 } } });
    const iconStyles = (route) => ({ color: isActive(route) ? theme.palette.primary.main : "primary.main", fontSize: 24 });
    const bottomSectionStyles = { p: 1, display: "flex", flexDirection: "column", gap: 1 };
    const buttonStyles = { textTransform: "none", minWidth: isMinimized ? 'auto' : undefined, px: isMinimized ? 1 : 2, justifyContent: isMinimized ? 'center' : 'flex-start', minHeight: 48, '& .MuiButton-startIcon': { margin: isMinimized ? 0 : undefined } };
    const modeButtonStyles = { ...buttonStyles, '& .MuiTypography-root': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.875rem', lineHeight: 1.2 } };
    const transactionsButtonStyles = { ...listItemStyles("/contractor/transactions"), ...(isDropdownActive() ? activeStyles : {}) };

    return (
        <Box sx={sidebarStyles} data-sidebar="true">
            <Box sx={headerStyles}>
                <Box component="img" src="../brand-2.png" alt="EasyTrack Logo" sx={logoStyles} onClick={() => handleNavigation("/contractor/")} />
                <IconButton onClick={() => setIsMinimized(!isMinimized)} size="small" sx={menuButtonStyles}><MenuIcon /></IconButton>
            </Box>

            <Divider />

            <Box flexGrow={1}>
                <List component="nav" sx={{ flexGrow: 1 }}>
                    <ListItemButton onClick={() => handleNavigation("/contractor/")} sx={listItemStyles("/contractor/")}>
                        <ListItemIcon><DashboardIcon sx={iconStyles("/contractor/")} /></ListItemIcon>
                        {!isMinimized && <ListItemText primary="Dashboard" />}
                    </ListItemButton>

                    <ListItemButton onClick={() => handleNavigation("/contractor/profile")} sx={listItemStyles("/contractor/profile")}>
                        <ListItemIcon><AccountCircleIcon sx={iconStyles("/contractor/profile")} /></ListItemIcon>
                        {!isMinimized && <ListItemText primary="Profile" />}
                    </ListItemButton>

                    <ListItemButton onClick={handleClickPages} sx={transactionsButtonStyles}>
                        <ListItemIcon><InventoryIcon sx={{ color: isDropdownActive() ? theme.palette.primary.main : "primary.main" }} /></ListItemIcon>
                        {!isMinimized && <><ListItemText primary="Transactions" />{openPages ? <ExpandLess /> : <ExpandMore />}</>}
                    </ListItemButton>

                    {!isMinimized && openPages && (
                        <Collapse in={openPages} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding sx={{ pl: 2 }}>
                                <ListItemButton sx={{ pl: 4, ...(isActive("/contractor/booking") ? activeStyles : {}), ...listItemStyles("/contractor/booking") }} onClick={() => handleNavigation("/contractor/booking")}>
                                    <ListItemIcon><ArticleIcon sx={iconStyles("/contractor/booking")} /></ListItemIcon>
                                    <ListItemText primary="Booking" />
                                </ListItemButton>

                                <ListItemButton sx={{ pl: 4, ...(isActive("/contractor/luggage-tracking") ? activeStyles : {}), ...listItemStyles("/contractor/luggage-tracking") }} onClick={() => handleNavigation("/contractor/luggage-tracking")}>
                                    <ListItemIcon><MyLocationIcon sx={iconStyles("/contractor/luggage-tracking")} /></ListItemIcon>
                                    <ListItemText primary="Luggage Tracking" />
                                </ListItemButton>

                                <ListItemButton sx={{ pl: 4, ...(isActive("/contractor/payments") ? activeStyles : {}), ...listItemStyles("/contractor/payments") }} onClick={() => handleNavigation("/contractor/payments")}>
                                    <ListItemIcon><PaymentIcon sx={iconStyles("/contractor/payments")} /></ListItemIcon>
                                    <ListItemText primary="Payments" />
                                </ListItemButton>
                            </List>
                        </Collapse>
                    )}

                    <ListItemButton onClick={() => handleNavigation("/contractor/chat-support")} sx={listItemStyles("/contractor/chat-support")}>
                        <ListItemIcon><SupportAgentIcon sx={iconStyles("/contractor/chat-support")} /></ListItemIcon>
                        {!isMinimized && <ListItemText primary="Chat Support" />}
                    </ListItemButton>

                    <ListItemButton onClick={() => handleNavigation("/contractor/history-and-reports")} sx={listItemStyles("/contractor/history-and-reports")}>
                        <ListItemIcon><AssignmentIcon sx={iconStyles("/contractor/history-and-reports")} /></ListItemIcon>
                        {!isMinimized && <ListItemText primary="History and Reports" />}
                    </ListItemButton>

                    <ListItemButton onClick={() => handleNavigation("/contractor/statistics")} sx={listItemStyles("/contractor/statistics")}>
                        <ListItemIcon><BarChartIcon sx={iconStyles("/contractor/statistics")} /></ListItemIcon>
                        {!isMinimized && <ListItemText primary="Statistics" />}
                    </ListItemButton>
                </List>
            </Box>

            <Divider />

            <Box sx={bottomSectionStyles}>
                <Button variant="contained" startIcon={mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />} onClick={toggleMode} fullWidth sx={buttonStyles}>
                    {!isMinimized && <Typography noWrap>{mode === 'light' ? 'Dark Mode' : 'Light Mode'}</Typography>}
                </Button>

                <Button variant="contained" color="error" startIcon={<LogoutIcon />} onClick={handleLogout} fullWidth sx={buttonStyles}>
                    {!isMinimized && "Logout"}
                </Button>
            </Box>
        </Box>
    );
}