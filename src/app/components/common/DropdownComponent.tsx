'use client';

import React, { useState, useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { Check, KeyboardArrowDown as KeyboardArrowDownIcon } from "@mui/icons-material";

export interface DropdownOption {
  value: string;
  label: string;
  hint?: string;
}

export interface DropdownGroup {
  groupHeader: string;
  options: DropdownOption[];
}

export interface DropdownComponentProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: boolean;
  helperText?: string;
  label?: React.ReactNode;
  options?: DropdownOption[];
  groups?: DropdownGroup[];
  startIcon?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  maxHeight?: string | number;
  className?: string;
}

export const DropdownComponent: React.FC<DropdownComponentProps> = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  error = false,
  helperText,
  label,
  options,
  groups,
  startIcon,
  placeholder = "Select Option",
  disabled = false,
  fullWidth = true,
  maxHeight = 280,
  className,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
          onBlur?.();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        onBlur?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onBlur]);

  // Consolidate flat options lookup
  const allOptions: DropdownOption[] = options
    ? options
    : groups
    ? groups.flatMap((g) => g.options)
    : [];

  const selectedItem = allOptions.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    if (disabled) return;
    onChange(optionValue);
    setIsOpen(false);
  };

  const renderOptionItem = (opt: DropdownOption, index: number) => {
    const isSelected = opt.value === value;
    return (
      <Box
        key={opt.value}
        role="option"
        aria-selected={isSelected}
        onClick={(e) => {
          e.stopPropagation();
          handleSelect(opt.value);
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mx: 0.75,
          my: 0.35,
          px: 1.5,
          py: 1.1,
          borderRadius: "8px",
          cursor: "pointer",
          backgroundColor: isSelected ? "#eef2ff" : "transparent",
          color: isSelected ? "#3949ab" : "#1e293b",
          fontFamily: "'Inter', sans-serif",
          fontSize: "13.5px",
          fontWeight: isSelected ? 600 : 500,
          transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          transform: isOpen ? "translateY(0)" : "translateY(6px)",
          opacity: isOpen ? 1 : 0,
          transitionDelay: `${Math.min(index * 20, 140)}ms`,
          "&:hover": {
            backgroundColor: isSelected ? "#e0e7ff" : "#f1f5f9",
            color: isSelected ? "#312e81" : "#0f172a",
            transform: "translateX(4px)",
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          <Typography
            sx={{
              fontSize: "13.5px",
              fontWeight: isSelected ? 600 : 500,
              fontFamily: "'Inter', sans-serif",
              color: "inherit",
            }}
          >
            {opt.label}
          </Typography>
          {opt.hint && (
            <Typography
              sx={{
                fontSize: "11px",
                color: "#64748b",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {opt.hint}
            </Typography>
          )}
        </Box>

        {isSelected && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: "50%",
              backgroundColor: "#3949ab",
              color: "#ffffff",
              flexShrink: 0,
              boxShadow: "0 2px 6px rgba(57, 73, 171, 0.35)",
              animation: "mouldedCheckPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              "@keyframes mouldedCheckPop": {
                "0%": { transform: "scale(0.6)", opacity: 0 },
                "100%": { transform: "scale(1)", opacity: 1 },
              },
            }}
          >
            <Check sx={{ fontSize: 14, color: "#ffffff", strokeWidth: 1.5 }} />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        position: "relative",
        width: fullWidth ? "100%" : "auto",
        userSelect: "none",
        zIndex: isOpen ? 1200 : 1,
      }}
    >
      {/* Floating Moulded Label */}
      {label && (
        <Box
          sx={{
            position: "absolute",
            top: "-9px",
            left: "14px",
            backgroundColor: "#ffffff",
            px: 0.6,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
            transition: "all 0.2s ease",
          }}
        >
          <Typography
            sx={{
              fontSize: "12px",
              fontWeight: 600,
              color: disabled ? "#94a3b8" : error ? "#d32f2f" : isOpen ? "#3949ab" : "#475569",
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1,
            }}
          >
            {label}
          </Typography>
        </Box>
      )}

      {/* Main Moulded Trigger Box */}
      <Box
        id={id || (name ? `field-${name}` : undefined)}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: "53px",
          px: 1.75,
          backgroundColor: disabled ? "#f8fafc" : "#ffffff",
          cursor: disabled ? "not-allowed" : "pointer",
          borderRadius: isOpen ? "12px 12px 0 0" : "12px",
          border: error
            ? "1.5px solid #d32f2f"
            : isOpen
            ? "2px solid #3949ab"
            : "1px solid #cbd5e1",
          borderBottom: isOpen ? "1px solid #e2e8f0" : undefined,
          boxShadow: isOpen
            ? "0 4px 14px rgba(57, 73, 171, 0.12)"
            : "0 1px 2px rgba(0,0,0,0.02)",
          transition:
            "border-radius 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.28s ease",
          "&:hover": {
            borderColor: disabled
              ? "#cbd5e1"
              : error
              ? "#d32f2f"
              : isOpen
              ? "#3949ab"
              : "#94a3b8",
          },
          "&:focus-visible": {
            outline: "none",
            borderColor: "#3949ab",
          },
        }}
      >
        {/* Left Side: Start Icon + Selected Text */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, overflow: "hidden", flex: 1 }}>
          {startIcon && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                color: disabled ? "#94a3b8" : "#3949ab",
                "& *": { color: disabled ? "#94a3b8 !important" : "#3949ab !important" },
              }}
            >
              {startIcon}
            </Box>
          )}
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: selectedItem ? 600 : 400,
              color: disabled ? "#94a3b8" : selectedItem ? "#0f172a" : "#94a3b8",
              fontFamily: "'Inter', sans-serif",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selectedItem ? selectedItem.label : placeholder}
          </Typography>
        </Box>

        {/* Right Side: Animated Chevron */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: "6px",
            backgroundColor: isOpen ? "#eef2ff" : "transparent",
            transition: "all 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            ml: 1,
            flexShrink: 0,
          }}
        >
          <KeyboardArrowDownIcon
            sx={{
              fontSize: 20,
              color: disabled ? "#94a3b8" : isOpen ? "#3949ab" : "#64748b",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease",
            }}
          />
        </Box>
      </Box>

      {/* Moulded Sliding Options Dropdown Panel (Chocolaty Smooth Slide-Down) */}
      <Box
        role="listbox"
        sx={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          backgroundColor: "#ffffff",
          borderRadius: "0 0 12px 12px",
          border: error ? "1.5px solid #d32f2f" : "2px solid #3949ab",
          borderTop: "none",
          boxShadow:
            "0 18px 36px -4px rgba(15, 23, 42, 0.16), 0 8px 16px -2px rgba(15, 23, 42, 0.08)",
          overflowY: "auto",
          overflowX: "hidden",
          maxHeight: isOpen ? `${maxHeight}px` : "0px",
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "translateY(0)" : "translateY(-4px)",
          pointerEvents: isOpen ? "auto" : "none",
          transition:
            "max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          py: isOpen ? 0.75 : 0,
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#cbd5e1",
            borderRadius: "3px",
          },
        }}
      >
        {/* Render Flat Options */}
        {options && options.map((opt, index) => renderOptionItem(opt, index))}

        {/* Render Grouped Options */}
        {groups &&
          groups.map((group, groupIdx) => (
            <Box key={group.groupHeader} sx={{ mb: groupIdx < groups.length - 1 ? 1 : 0 }}>
              <Box
                sx={{
                  backgroundColor: "#ffffff",
                  color: "#3949ab",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  lineHeight: "28px",
                  px: 2,
                  pt: groupIdx === 0 ? 0.5 : 1,
                  pb: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  borderTop: groupIdx > 0 ? "1px solid #f1f5f9" : "none",
                  "&::after": {
                    content: '""',
                    flex: 1,
                    height: "1px",
                    backgroundColor: "#e0e7ff",
                    ml: 1,
                  },
                }}
              >
                {group.groupHeader}
              </Box>
              {group.options.map((opt, optIdx) =>
                renderOptionItem(opt, groupIdx * 10 + optIdx)
              )}
            </Box>
          ))}
      </Box>

      {/* Error Message */}
      {error && helperText && (
        <Typography
          color="error"
          sx={{ mt: 0.5, ml: 1, fontSize: "11px", fontFamily: "Verdana, sans-serif" }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default DropdownComponent;
