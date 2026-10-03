import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Admin from "@/pages/admin";

// Strip trailing slash so wouter base behaves correctly. "" means root.
const ROUTER_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Events platform — lazy-loaded so the wall page stays as light as before.
const PublicEvents = lazy(() => import("@/events/pages/PublicEvents"));
const EventDetail = lazy(() => import("@/events/pages/EventDetail"));
const RegisterPage = lazy(() => import("@/events/pages/Register"));
const TicketPage = lazy(() => import("@/events/pages/Ticket"));
const Dashboard = lazy(() => import("@/events/manage/Dashboard"));
const EventsList = lazy(() => import("@/events/manage/EventsList"));
const EventEdit = lazy(() => import("@/events/manage/EventEdit"));
const Attendees = lazy(() => import("@/events/manage/Attendees"));
const CheckIn = lazy(() => import("@/events/manage/CheckIn"));
const LoginPage = lazy(() => import("@/events/manage/AuthPages").then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import("@/events/manage/AuthPages").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/events/manage/AuthPages").then((m) => ({ default: m.ResetPasswordPage })));
const AcceptInvitePage = lazy(() => import("@/events/manage/AuthPages").then((m) => ({ default: m.AcceptInvitePage })));
const TeamPage = lazy(() => import("@/events/manage/TeamSettings").then((m) => ({ default: m.TeamPage })));
const SettingsPage = lazy(() => import("@/events/manage/TeamSettings").then((m) => ({ default: m.SettingsPage })));
const PlatformPage = lazy(() => import("@/events/manage/TeamSettings").then((m) => ({ default: m.PlatformPage })));
const GarmentsPage = lazy(() => import("@/garments/GarmentsPage"));
const GarmentsManage = lazy(() => import("@/garments/GarmentsManage"));

function EventsFallback() {
  return <div className="min-h-screen bg-black" aria-busy="true" />;
}

function Router() {
  return (
    <WouterRouter base={ROUTER_BASE}>
      <Suspense fallback={<EventsFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/family" component={Home} />
          <Route path="/family-wall" component={Home} />
          <Route path="/admin" component={Admin} />
          <Route path="/family-admin" component={Admin} />

          {/* Events platform — order matters: fixed prefixes before :slug */}
          <Route path="/events" component={PublicEvents} />
          <Route path="/events/manage/login" component={LoginPage} />
          <Route path="/events/manage/forgot-password" component={ForgotPasswordPage} />
          <Route path="/events/manage/reset-password" component={ResetPasswordPage} />
          <Route path="/events/manage/accept-invite" component={AcceptInvitePage} />
          <Route path="/events/manage" component={Dashboard} />
          <Route path="/events/manage/events" component={EventsList} />
          <Route path="/events/manage/events/new" component={EventEdit} />
          <Route path="/events/manage/events/:eventId" component={EventEdit} />
          <Route path="/events/manage/events/:eventId/attendees" component={Attendees} />
          <Route path="/events/manage/events/:eventId/check-in" component={CheckIn} />
          <Route path="/events/manage/team" component={TeamPage} />
          <Route path="/events/manage/settings" component={SettingsPage} />
          <Route path="/events/platform" component={PlatformPage} />
          <Route path="/events/platform/businesses" component={PlatformPage} />
          <Route path="/events/t/:token" component={TicketPage} />
          <Route path="/events/t/:token/print" component={TicketPage} />
          <Route path="/events/:slug" component={EventDetail} />
          <Route path="/events/:slug/register" component={RegisterPage} />

          <Route path="/garments/manage" component={GarmentsManage} />
          <Route path="/garments/archive/:slug?">{() => <GarmentsPage archive />}</Route>
          <Route path="/garments/:slug?">{() => <GarmentsPage />}</Route>

          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
