import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik } from "formik";
import {
  Box,
  Divider,
  Typography,
  Button,
  Dialog,
  TextField,
  useMediaQuery,
  LinearProgress,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import InfoIcon from "@mui/icons-material/Info";

import Loader from "../../components/common/Loader";
import Toast from "../../components/common/Toast";

import { Utility } from "@/utils";
import { useCreateTicketLog } from "@/hooks/ticketLogs";
import { TicketDetail } from "./MainPage";

interface CreateTicketResponse {
  statusCode: number;
  data: Array<{}>;
}

interface FormComponentProps {
  openDialog: boolean;
  setOpenDialog: ( open: boolean ) => void;
  ticketDetailData: any;
  ticketId: string | string[];
  originalEstimate: string | undefined;
}

interface InitialValues {
  time_spent: string;
  work_description: string;
}

const initialValues: InitialValues = {
  time_spent: "",
  work_description: "",
};

const TrackingForm: React.FC<FormComponentProps> = ( {
  openDialog,
  setOpenDialog,
  ticketDetailData,
  ticketId,
  originalEstimate
} ) => {
  const { decodedToken, parseTimeSpent, toastAndNavigate } = Utility();
  const [ loading, setLoading ] = useState( false );
  // 1. OFFICIAL STATES (values that reflect the server’s “saved” total)
  const [ officialTimeSpent, setOfficialTimeSpent ] = useState( "" );
  const [ officialTimeRemaining, setOfficialTimeRemaining ] = useState( originalEstimate );
  const [ officialProgress, setOfficialProgress ] = useState( 0 );
  const [ officialOverage, setOfficialOverage ] = useState( 0 );

  // 2. PREVIEW STATES (what user sees/edits in this dialog)
  const [ previewTimeSpent, setPreviewTimeSpent ] = useState<string>( "" );
  const [ previewTimeRemaining, setPreviewTimeRemaining ] = useState<string | undefined>( "" );
  const [ previewProgress, setPreviewProgress ] = useState( 0 );
  const [ previewOverage, setPreviewOverage ] = useState( 0 );

  const toastInfo = useSelector( ( state: any ) => state.toast );
  const dispatch = useDispatch();
  const theme = useTheme();
  const fullScreen = useMediaQuery( theme.breakpoints.down( "md" ) );
  const isMobile = useMediaQuery( "(max-width:600px)" );
  const isTab = useMediaQuery( "(min-width:601px) and (max-width:1200px)" );
  const originalEstimateHours = useMemo( () => parseTimeSpent( originalEstimate ), [ originalEstimate ] );

  const { createTicketLog } = useCreateTicketLog( "create-ticket-log" );

  const convertHoursToDaysAndHours = ( hours: number ): string => {
    const days = Math.floor( hours / 8 );
    const remainingHours = hours % 8;
    return `${ days }d ${ remainingHours }h`;
  };

  useEffect( () => {
    if ( openDialog )
    {
      setPreviewTimeSpent( officialTimeSpent );
      setPreviewTimeRemaining( officialTimeRemaining );
      setPreviewProgress( officialProgress );
      setPreviewOverage( officialOverage );
    }
  }, [
    openDialog,
    officialTimeSpent,
    officialTimeRemaining,
    officialProgress,
    officialOverage,
  ] );

  useEffect( () => {
    if ( ticketDetailData )
    {
      const totalHours = ticketDetailData.reduce( ( acc: number, ticket: any ) => {
        return acc + parseTimeSpent( ticket.time_spent ?? 0 );
      }, 0 );
      const finalTime = convertHoursToDaysAndHours( totalHours );
      setOfficialTimeSpent( finalTime );

      const calculatedProgress = Math.min( ( totalHours / originalEstimateHours ) * 100, 100 );
      const calculatedOverage = totalHours > originalEstimateHours ? ( ( totalHours - originalEstimateHours ) / originalEstimateHours ) * 100 : 0;

      setOfficialTimeRemaining( convertHoursToDaysAndHours( Math.max( originalEstimateHours - totalHours, 0 ) ) );
      setOfficialProgress( calculatedProgress );
      setOfficialOverage( calculatedOverage );
    }
  }, [ ticketDetailData, originalEstimateHours ] );

  const handleTimeSpentChange = useCallback( (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    handleChange: ( event: React.ChangeEvent<any> ) => void
  ) => {
    const { value } = event.target;
    const newAdditionalHours = parseTimeSpent( value );
    const alreadyLoggedHours = parseTimeSpent( officialTimeSpent );
    const totalTimeSpent = alreadyLoggedHours + newAdditionalHours;

    const remainingTime = Math.max( originalEstimateHours - totalTimeSpent, 0 );
    const formattedRemainingTime = convertHoursToDaysAndHours( remainingTime );

    setPreviewTimeRemaining( formattedRemainingTime );
    setPreviewTimeSpent( convertHoursToDaysAndHours( totalTimeSpent ) );

    const calculatedProgress = Math.min( ( totalTimeSpent / originalEstimateHours ) * 100, 100 );
    const calculatedOverage = totalTimeSpent > originalEstimateHours ? ( ( totalTimeSpent - originalEstimateHours ) / originalEstimateHours ) * 100 : 0;

    setPreviewProgress( calculatedProgress );
    setPreviewOverage( calculatedOverage );
    handleChange( event );
  },
    [ originalEstimateHours, officialTimeSpent ]
  );

  const handleDialogClose = useCallback( () => {
    setPreviewTimeSpent( officialTimeSpent );
    setPreviewTimeRemaining( officialTimeRemaining );
    setPreviewProgress( officialProgress );
    setPreviewOverage( officialOverage );
    setOpenDialog( false );
  }, [
    officialTimeSpent,
    officialTimeRemaining,
    officialProgress,
    officialOverage,
    setOpenDialog
  ] );

  const createTracking = useCallback(
    async ( values: InitialValues ) => {
      setLoading( true );
      const data = {
        ticket_id: +ticketId,
        user_id: decodedToken()?.id,
        ...values,
      };
      if ( data )
      {
        try
        {
          const createdResponse: CreateTicketResponse = await createTicketLog(
            data
          );
          console.log( createdResponse, 'resp' )
          if ( createdResponse?.statusCode === 200 )
          {
            setOfficialTimeSpent( previewTimeSpent );
            setOfficialTimeRemaining( previewTimeRemaining );
            setOfficialProgress( previewProgress );
            setOfficialOverage( previewOverage );
            setLoading( false );
            toastAndNavigate(
              dispatch,
              true,
              "info",
              "Time Logged Successfully",
              null,
              null,
              true
            );
          }
        } catch ( error )
        {
          toastAndNavigate(
            dispatch,
            true,
            "error",
            "Error Occurred, Please Try Again",
            null,
            null,
            true
          );
        } finally
        {
          setLoading( false );
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ ticketId ]
  );

  return (
    <div>
      <Dialog
        fullScreen={fullScreen}
        open={openDialog}
        onClose={handleDialogClose}
        aria-labelledby="responsive-dialog-title"
        sx={{
          "& .MuiPaper-root": {
            borderRadius: "16px",
            padding: 2,
          },
        }}
      >
        <Typography
          variant="h5"
          fontWeight="700"
          textAlign="center"
          sx={{ mt: 2, mb: 1, color: "text.primary" }}
        >
          Time Tracking
        </Typography>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          onSubmit={( values, { resetForm } ) => {
            createTracking( values );
            resetForm();
            handleDialogClose();
          }}
        >
          {( {
            values,
            errors,
            touched,
            dirty,
            isSubmitting,
            handleBlur,
            handleChange,
            handleSubmit,
            resetForm
          } ) => (
            <form onSubmit={handleSubmit}>
              <Box
                padding="1rem"
                width={isMobile ? "90vw" : isTab ? "50vw" : "32vw"}
                mx="auto"
              >
                <Box
                  sx={{
                    position: "relative",
                    width: isMobile ? "70vw" : isTab ? "50vw" : "28vw",
                    height: 8,
                    display: "flex",
                  }}
                >
                  {/* Blue Progress (within estimate preview) */}
                  <LinearProgress
                    variant="determinate"
                    value={previewProgress > 100 ? 100 : previewProgress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      flexGrow: 1,
                      backgroundColor: "var(--mui-palette-neutral-200)",
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: "#36B37E",
                      },
                    }}
                  />
                  {/* Orange Progress (exceeds estimate) */}
                  {previewOverage > 0 && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0, // Start the orange bar from the beginning
                        width: "100%",
                        height: "100%",
                        display: "flex", // Use flex to overlay bars
                      }}
                    >
                      {/* Green part, reduced proportionally */}
                      <Box
                        sx={{
                          height: 8,
                          borderRadius: 2,
                          width: `${ 100 - previewOverage }%`, // Reduce green width based on overage
                          backgroundColor: "#36B37E",
                        }}
                      />
                      {/* Orange part */}
                      <Box
                        sx={{
                          height: 8,
                          borderRadius: 2,
                          width: `${ previewOverage }%`, // #FFAB00 width is the overage percentage
                          backgroundColor: "#FFAB00",
                        }}
                      />
                    </Box>
                  )}
                </Box>

                {/* Original estimate info */}
                <Box display="flex" flexDirection="column" mt={2} ml={2}>
                  <Typography variant="body2" color="textSecondary" fontSize={isMobile ? "0.8rem" : "1rem"}>
                    {previewTimeSpent && previewTimeSpent !== "0d 0h"
                      ? `${ previewTimeSpent } logged`
                      : "No time logged"}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Typography variant="body2" color="textSecondary" fontSize={isMobile ? "0.8rem" : "0.9rem"}>
                      The original estimate for this issue was
                    </Typography>
                    <Typography variant="body2" color="primary" ml={1}>
                      {originalEstimate}
                    </Typography>
                    <Tooltip title="Estimated time to complete this issue">
                      <InfoIcon sx={{ ml: 1, fontSize: 16, cursor: "pointer" }} />
                    </Tooltip>
                  </Box>
                </Box>

                <Box
                  display="grid"
                  gridTemplateColumns="repeat(2, 1fr)"
                  gap="20px"
                  padding="20px"
                  mt={4}
                  bgcolor="var(--mui-palette-neutral-50)"
                  borderRadius="12px"
                  border="1px solid var(--mui-palette-neutral-200)"
                >
                  {/* Time Spent Field */}
                  <TextField
                    variant="filled"
                    type="text"
                    name="time_spent"
                    placeholder="Use the format: 1d 6h 45m"
                    label="Time Spent"
                    onBlur={handleBlur}
                    onChange={( e ) => handleTimeSpentChange( e, handleChange )}
                    value={values.time_spent}
                    error={!!touched.time_spent && !!errors.time_spent}
                    helperText={touched.time_spent && errors.time_spent}
                  />

                  {/* Time Remaining Field */}
                  <TextField
                    variant="filled"
                    label="Time Remaining"
                    disabled
                    value={previewTimeRemaining}
                    fullWidth
                  />

                  <TextField
                    variant="filled"
                    name="work_description"
                    label="Work Description"
                    onChange={handleChange}
                    value={values.work_description}
                    error={
                      !!touched.work_description && !!errors.work_description
                    }
                    helperText={
                      touched.work_description && errors.work_description
                    }
                    InputLabelProps={{
                      shrink: true,
                    }}
                    multiline
                    rows={4}
                    sx={{ gridColumn: "span 2", width: "100%" }}
                  />
                </Box>
              </Box>
              <Divider />
              <Box
                display="flex"
                justifyContent={
                  isMobile ? "center" : isTab ? "center" : "center"
                }
                p="20px"
              >
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    mr: 2,
                    px: 2,
                    py: 0.4,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    textTransform: "none",
                    color: "#64748b",
                    borderColor: "#cbd5e1",
                    borderRadius: "6px",
                    "&:hover": {
                      bgcolor: "#f1f5f9",
                      borderColor: "#94a3b8",
                      color: "#0f172a",
                    },
                  }}
                  onClick={() => {
                    resetForm();
                    handleDialogClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  type="submit"
                  variant="contained"
                  startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : null}
                  sx={{
                    px: 2,
                    py: 0.4,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    textTransform: "none",
                    bgcolor: "#3949ab",
                    color: "#ffffff",
                    borderRadius: "6px",
                    boxShadow: "none",
                    "&:hover": { bgcolor: "#303f9f", boxShadow: "none" },
                    "&:disabled": { bgcolor: "#cbd5e1", color: "#94a3b8" },
                  }}
                  disabled={!dirty || isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
                <Toast
                  alerting={toastInfo.toastAlert}
                  severity={toastInfo.toastSeverity}
                  message={toastInfo.toastMessage}
                />
              </Box>
            </form>
          )}
        </Formik>
        {loading && <Loader />}
      </Dialog>
    </div>
  );
};

export default TrackingForm;
