import SpeedRounded from "@mui/icons-material/SpeedRounded";
import FolderSpecialRounded from "@mui/icons-material/FolderSpecialRounded";
import FiberNewRounded from "@mui/icons-material/FiberNewRounded";
import AssignmentRounded from "@mui/icons-material/AssignmentRounded";   // operational task/ticket
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import AccountBalanceRounded from "@mui/icons-material/AccountBalanceRounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import BusinessRounded from "@mui/icons-material/BusinessRounded";
import LeaderboardRounded from "@mui/icons-material/LeaderboardRounded";
import ManageSearchRounded from "@mui/icons-material/ManageSearchRounded";
import AdminPanelSettingsRounded from "@mui/icons-material/AdminPanelSettingsRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import SupervisedUserCircleRounded from "@mui/icons-material/SupervisedUserCircleRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";

export const navIcons: Record<string, React.ElementType> = {
  "chart-pie": SpeedRounded,
  "folder-open": FolderSpecialRounded,
  "fiber-new": FiberNewRounded,
  "ticket": AssignmentRounded,       // operational task icon
  "people": GroupsRounded,
  "bank": AccountBalanceRounded,
  "file-archive": Inventory2Rounded,
  "business": BusinessRounded,
  "plugs-connected": LeaderboardRounded,
  "list-magnifying-glass": ManageSearchRounded,
  "gear-six": AdminPanelSettingsRounded,
  "user": PersonRounded,
  "users": SupervisedUserCircleRounded,
  "security": SecurityRounded,
  "shield": SecurityRounded,
};
