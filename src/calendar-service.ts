import type { GoogleClient } from "./google-client.js";

const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

// --- Types ---

export interface CalendarInfo {
  id: string;
  summary: string;
  description: string | null;
  timeZone: string | null;
  accessRole: string | null;
  primary: boolean;
}

export interface CalendarEvent {
  id: string;
  summary: string | null;
  start: string | null;
  end: string | null;
  location: string | null;
  status: string | null;
  creator: { email: string; displayName?: string; self?: boolean } | null;
  organizer: { email: string; displayName?: string; self?: boolean } | null;
  hangoutLink: string | null;
  eventType: string | null;
  recurringEventId: string | null;
  updated: string | null;
}

export interface CalendarEventDetail {
  id: string;
  summary: string | null;
  description: string | null;
  start: string | null;
  end: string | null;
  startTimeZone: string | null;
  endTimeZone: string | null;
  location: string | null;
  status: string | null;
  creator: { email: string; displayName?: string; self?: boolean } | null;
  organizer: { email: string; displayName?: string; self?: boolean } | null;
  attendees?: {
    email: string;
    displayName?: string;
    responseStatus: string;
    organizer?: boolean;
    self?: boolean;
    optional?: boolean;
    comment?: string;
    additionalGuests?: number;
  }[];
  hangoutLink: string | null;
  conferenceData: {
    entryPoints?: { entryPointType: string; uri: string; label?: string }[];
    conferenceSolution?: { name: string; iconUri?: string };
    conferenceId?: string;
  } | null;
  recurrence: string[] | null;
  recurringEventId: string | null;
  htmlLink: string | null;
  colorId: string | null;
  visibility: string | null;
  transparency: string | null;
  reminders: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  } | null;
  created: string | null;
  updated: string | null;
  iCalUID: string | null;
  eventType: string | null;
  guestsCanModify: boolean | null;
  guestsCanInviteOthers: boolean | null;
  guestsCanSeeOtherGuests: boolean | null;
}

// --- Raw API response types ---

interface RawEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  status?: string;
  creator?: { email?: string; displayName?: string; self?: boolean };
  organizer?: { email?: string; displayName?: string; self?: boolean };
  attendees?: {
    email?: string;
    displayName?: string;
    responseStatus?: string;
    organizer?: boolean;
    self?: boolean;
    optional?: boolean;
    comment?: string;
    additionalGuests?: number;
  }[];
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string; label?: string }[];
    conferenceSolution?: { name?: { key?: string }; iconUri?: string };
    conferenceId?: string;
    createRequest?: {
      requestId?: string;
      conferenceSolutionKey?: { type?: string };
      status?: { statusCode?: string };
    };
  };
  recurrence?: string[];
  recurringEventId?: string;
  htmlLink?: string;
  colorId?: string;
  visibility?: string;
  transparency?: string;
  reminders?: {
    useDefault?: boolean;
    overrides?: { method?: string; minutes?: number }[];
  };
  created?: string;
  updated?: string;
  iCalUID?: string;
  eventType?: string;
  guestsCanModify?: boolean;
  guestsCanInviteOthers?: boolean;
  guestsCanSeeOtherGuests?: boolean;
}

// --- Shared mappers ---

function mapRawPerson(
  raw?: { email?: string; displayName?: string; self?: boolean },
): { email: string; displayName?: string; self?: boolean } | null {
  if (!raw?.email) return null;
  const result: { email: string; displayName?: string; self?: boolean } = {
    email: raw.email,
  };
  if (raw.displayName) result.displayName = raw.displayName;
  if (raw.self) result.self = raw.self;
  return result;
}

function mapRawEventToListItem(raw: RawEvent): CalendarEvent {
  return {
    id: raw.id ?? "",
    summary: raw.summary ?? null,
    start: raw.start?.dateTime ?? raw.start?.date ?? null,
    end: raw.end?.dateTime ?? raw.end?.date ?? null,
    location: raw.location ?? null,
    status: raw.status ?? null,
    creator: mapRawPerson(raw.creator),
    organizer: mapRawPerson(raw.organizer),
    hangoutLink: raw.hangoutLink ?? null,
    eventType: raw.eventType ?? null,
    recurringEventId: raw.recurringEventId ?? null,
    updated: raw.updated ?? null,
  };
}

function mapRawEventToDetail(raw: RawEvent): CalendarEventDetail {
  return {
    id: raw.id ?? "",
    summary: raw.summary ?? null,
    description: raw.description ?? null,
    start: raw.start?.dateTime ?? raw.start?.date ?? null,
    end: raw.end?.dateTime ?? raw.end?.date ?? null,
    startTimeZone: raw.start?.timeZone ?? null,
    endTimeZone: raw.end?.timeZone ?? null,
    location: raw.location ?? null,
    status: raw.status ?? null,
    creator: mapRawPerson(raw.creator),
    organizer: mapRawPerson(raw.organizer),
    attendees: raw.attendees?.map((a) => ({
      email: a.email ?? "",
      displayName: a.displayName,
      responseStatus: a.responseStatus ?? "",
      organizer: a.organizer,
      self: a.self,
      optional: a.optional,
      comment: a.comment,
      additionalGuests: a.additionalGuests,
    })),
    hangoutLink: raw.hangoutLink ?? null,
    conferenceData: raw.conferenceData
      ? {
          entryPoints: raw.conferenceData.entryPoints?.map((ep) => ({
            entryPointType: ep.entryPointType ?? "",
            uri: ep.uri ?? "",
            label: ep.label,
          })),
          conferenceSolution: raw.conferenceData.conferenceSolution?.name?.key
            ? {
                name: raw.conferenceData.conferenceSolution.name.key,
                iconUri: raw.conferenceData.conferenceSolution.iconUri,
              }
            : undefined,
          conferenceId: raw.conferenceData.conferenceId,
        }
      : null,
    recurrence: raw.recurrence ?? null,
    recurringEventId: raw.recurringEventId ?? null,
    htmlLink: raw.htmlLink ?? null,
    colorId: raw.colorId ?? null,
    visibility: raw.visibility ?? null,
    transparency: raw.transparency ?? null,
    reminders: raw.reminders
      ? {
          useDefault: raw.reminders.useDefault ?? true,
          overrides: raw.reminders.overrides?.map((o) => ({
            method: o.method ?? "popup",
            minutes: o.minutes ?? 10,
          })),
        }
      : null,
    created: raw.created ?? null,
    updated: raw.updated ?? null,
    iCalUID: raw.iCalUID ?? null,
    eventType: raw.eventType ?? null,
    guestsCanModify: raw.guestsCanModify ?? null,
    guestsCanInviteOthers: raw.guestsCanInviteOthers ?? null,
    guestsCanSeeOtherGuests: raw.guestsCanSeeOtherGuests ?? null,
  };
}

// --- API Functions ---

export async function calendarList(
  client: GoogleClient,
): Promise<CalendarInfo[]> {
  const data = await client.request<{
    items?: {
      id?: string;
      summary?: string;
      description?: string;
      timeZone?: string;
      accessRole?: string;
      primary?: boolean;
    }[];
  }>("GET", `${CALENDAR_BASE}/users/me/calendarList`);

  return (data.items ?? []).map((c) => ({
    id: c.id ?? "",
    summary: c.summary ?? "",
    description: c.description ?? null,
    timeZone: c.timeZone ?? null,
    accessRole: c.accessRole ?? null,
    primary: c.primary ?? false,
  }));
}

export async function calendarListEvents(
  client: GoogleClient,
  opts: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    query?: string;
    maxResults?: number;
    updatedMin?: string;
    showDeleted?: boolean;
    showHiddenInvitations?: boolean;
    timeZone?: string;
    pageToken?: string;
    eventTypes?: string[];
    iCalUID?: string;
    singleEvents?: boolean;
    orderBy?: string;
  },
): Promise<{ events: CalendarEvent[]; nextPageToken?: string }> {
  const calendarId = encodeURIComponent(opts.calendarId ?? "primary");
  const params = new URLSearchParams();

  if (opts.timeMin) params.set("timeMin", opts.timeMin);
  if (opts.timeMax) params.set("timeMax", opts.timeMax);
  if (opts.maxResults) params.set("maxResults", String(opts.maxResults));
  if (opts.query) params.set("q", opts.query);
  if (opts.updatedMin) params.set("updatedMin", opts.updatedMin);
  if (opts.showDeleted !== undefined)
    params.set("showDeleted", String(opts.showDeleted));
  if (opts.showHiddenInvitations !== undefined)
    params.set("showHiddenInvitations", String(opts.showHiddenInvitations));
  if (opts.timeZone) params.set("timeZone", opts.timeZone);
  if (opts.pageToken) params.set("pageToken", opts.pageToken);
  if (opts.iCalUID) params.set("iCalUID", opts.iCalUID);

  // singleEvents defaults to true; only omit if explicitly false
  const singleEvents = opts.singleEvents ?? true;
  params.set("singleEvents", String(singleEvents));

  if (opts.orderBy) {
    params.set("orderBy", opts.orderBy);
  } else if (singleEvents) {
    params.set("orderBy", "startTime");
  }

  if (opts.eventTypes?.length) {
    for (const et of opts.eventTypes) {
      params.append("eventTypes", et);
    }
  }

  const data = await client.request<{
    items?: RawEvent[];
    nextPageToken?: string;
  }>("GET", `${CALENDAR_BASE}/calendars/${calendarId}/events?${params}`);

  return {
    events: (data.items ?? []).map(mapRawEventToListItem),
    nextPageToken: data.nextPageToken,
  };
}

export async function calendarGetEvent(
  client: GoogleClient,
  opts: { calendarId?: string; eventId: string },
): Promise<CalendarEventDetail> {
  const calendarId = encodeURIComponent(opts.calendarId ?? "primary");
  const event = await client.request<RawEvent>(
    "GET",
    `${CALENDAR_BASE}/calendars/${calendarId}/events/${opts.eventId}`,
  );
  return mapRawEventToDetail(event);
}

export type AttendeeInput = string | { email: string; optional?: boolean; responseStatus?: string };

export async function calendarCreateEvent(
  client: GoogleClient,
  opts: {
    calendarId?: string;
    summary: string;
    description?: string;
    startDateTime: string;
    endDateTime: string;
    timeZone?: string;
    location?: string;
    attendees?: AttendeeInput[];
    sendUpdates?: "all" | "externalOnly" | "none";
    createMeetLink?: boolean;
    recurrence?: string[];
    reminders?: { useDefault: boolean; overrides?: { method: string; minutes: number }[] };
    visibility?: string;
    transparency?: string;
    colorId?: string;
    allDay?: boolean;
    guestsCanModify?: boolean;
    guestsCanInviteOthers?: boolean;
    guestsCanSeeOtherGuests?: boolean;
  },
): Promise<{ event: CalendarEventDetail; dedupSkipped?: string }> {
  const calendarId = encodeURIComponent(opts.calendarId ?? "primary");

  // Dedup check: look for events with same summary within +/-24h window
  const startMs = new Date(opts.startDateTime).getTime();
  const windowMin = new Date(startMs - 24 * 60 * 60 * 1000).toISOString();
  const windowMax = new Date(startMs + 24 * 60 * 60 * 1000).toISOString();

  const dedupParams = new URLSearchParams({
    timeMin: windowMin,
    timeMax: windowMax,
    q: opts.summary,
    singleEvents: "true",
    maxResults: "10",
  });

  const existing = await client.request<{ items?: RawEvent[] }>(
    "GET",
    `${CALENDAR_BASE}/calendars/${calendarId}/events?${dedupParams}`,
  );

  const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const duplicate = (existing.items ?? []).find(
    (e) => normalise(e.summary ?? "") === normalise(opts.summary),
  );

  if (duplicate) {
    return {
      event: mapRawEventToDetail(duplicate),
      dedupSkipped: `Skipped — duplicate event already exists: "${duplicate.summary}" (${duplicate.id}) on ${duplicate.start?.dateTime ?? duplicate.start?.date}`,
    };
  }

  // Build URL with query params
  const queryParams = new URLSearchParams();
  if (opts.sendUpdates) queryParams.set("sendUpdates", opts.sendUpdates);
  if (opts.createMeetLink) queryParams.set("conferenceDataVersion", "1");
  const qs = queryParams.toString();
  const url = `${CALENDAR_BASE}/calendars/${calendarId}/events${qs ? `?${qs}` : ""}`;

  // Build start/end based on allDay flag
  const start = opts.allDay
    ? { date: opts.startDateTime }
    : { dateTime: opts.startDateTime, timeZone: opts.timeZone };
  const end = opts.allDay
    ? { date: opts.endDateTime }
    : { dateTime: opts.endDateTime, timeZone: opts.timeZone };

  // Build attendees
  const attendees = opts.attendees?.map((a) =>
    typeof a === "string" ? { email: a } : a,
  );

  // Build request body
  const body: Record<string, unknown> = {
    summary: opts.summary,
    start,
    end,
  };
  if (opts.description !== undefined) body.description = opts.description;
  if (opts.location !== undefined) body.location = opts.location;
  if (attendees?.length) body.attendees = attendees;
  if (opts.recurrence?.length) body.recurrence = opts.recurrence;
  if (opts.reminders) body.reminders = opts.reminders;
  if (opts.visibility) body.visibility = opts.visibility;
  if (opts.transparency) body.transparency = opts.transparency;
  if (opts.colorId) body.colorId = opts.colorId;
  if (opts.guestsCanModify !== undefined)
    body.guestsCanModify = opts.guestsCanModify;
  if (opts.guestsCanInviteOthers !== undefined)
    body.guestsCanInviteOthers = opts.guestsCanInviteOthers;
  if (opts.guestsCanSeeOtherGuests !== undefined)
    body.guestsCanSeeOtherGuests = opts.guestsCanSeeOtherGuests;

  // Add conference data request for Meet link creation
  if (opts.createMeetLink) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const event = await client.request<RawEvent>("POST", url, body);
  return { event: mapRawEventToDetail(event) };
}

export async function calendarUpdateEvent(
  client: GoogleClient,
  opts: {
    calendarId?: string;
    eventId: string;
    summary?: string;
    description?: string;
    startDateTime?: string;
    endDateTime?: string;
    timeZone?: string;
    location?: string;
    attendees?: AttendeeInput[];
    sendUpdates?: "all" | "externalOnly" | "none";
    createMeetLink?: boolean;
    recurrence?: string[];
    reminders?: { useDefault: boolean; overrides?: { method: string; minutes: number }[] };
    visibility?: string;
    transparency?: string;
    colorId?: string;
    guestsCanModify?: boolean;
    guestsCanInviteOthers?: boolean;
    guestsCanSeeOtherGuests?: boolean;
  },
): Promise<{ event: CalendarEventDetail; dedupSkipped?: string }> {
  const calendarId = encodeURIComponent(opts.calendarId ?? "primary");

  // Fetch existing event to verify it exists
  const existing = await client.request<RawEvent>(
    "GET",
    `${CALENDAR_BASE}/calendars/${calendarId}/events/${opts.eventId}`,
  );

  const body: Record<string, unknown> = {};
  if (opts.summary !== undefined) body.summary = opts.summary;
  if (opts.description !== undefined) body.description = opts.description;
  if (opts.location !== undefined) body.location = opts.location;
  if (opts.startDateTime) {
    body.start = { dateTime: opts.startDateTime, timeZone: opts.timeZone };
  }
  if (opts.endDateTime) {
    body.end = { dateTime: opts.endDateTime, timeZone: opts.timeZone };
  }
  if (opts.attendees) {
    body.attendees = opts.attendees.map((a) =>
      typeof a === "string" ? { email: a } : a,
    );
  }
  if (opts.recurrence?.length) body.recurrence = opts.recurrence;
  if (opts.reminders) body.reminders = opts.reminders;
  if (opts.visibility) body.visibility = opts.visibility;
  if (opts.transparency) body.transparency = opts.transparency;
  if (opts.colorId) body.colorId = opts.colorId;
  if (opts.guestsCanModify !== undefined)
    body.guestsCanModify = opts.guestsCanModify;
  if (opts.guestsCanInviteOthers !== undefined)
    body.guestsCanInviteOthers = opts.guestsCanInviteOthers;
  if (opts.guestsCanSeeOtherGuests !== undefined)
    body.guestsCanSeeOtherGuests = opts.guestsCanSeeOtherGuests;

  // Add conference data request for Meet link creation
  if (opts.createMeetLink) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  // Dedup check if summary or start time is changing
  if (opts.summary || opts.startDateTime) {
    const checkSummary = opts.summary ?? existing.summary ?? "";
    const checkStart =
      opts.startDateTime ??
      existing.start?.dateTime ??
      existing.start?.date ??
      "";
    const startMs = new Date(checkStart).getTime();
    const windowMin = new Date(startMs - 24 * 60 * 60 * 1000).toISOString();
    const windowMax = new Date(startMs + 24 * 60 * 60 * 1000).toISOString();

    const dedupParams = new URLSearchParams({
      timeMin: windowMin,
      timeMax: windowMax,
      q: checkSummary,
      singleEvents: "true",
      maxResults: "10",
    });

    const similar = await client.request<{ items?: RawEvent[] }>(
      "GET",
      `${CALENDAR_BASE}/calendars/${calendarId}/events?${dedupParams}`,
    );

    const normalise = (s: string) =>
      s.toLowerCase().replace(/\s+/g, " ").trim();
    const duplicate = (similar.items ?? []).find(
      (e) =>
        e.id !== opts.eventId &&
        normalise(e.summary ?? "") === normalise(checkSummary),
    );

    if (duplicate) {
      return {
        event: mapRawEventToDetail(duplicate),
        dedupSkipped: `Skipped — duplicate event found: "${duplicate.summary}" (${duplicate.id}) on ${duplicate.start?.dateTime ?? duplicate.start?.date}`,
      };
    }
  }

  // Build URL with query params
  const queryParams = new URLSearchParams();
  if (opts.sendUpdates) queryParams.set("sendUpdates", opts.sendUpdates);
  if (opts.createMeetLink) queryParams.set("conferenceDataVersion", "1");
  const qs = queryParams.toString();
  const url = `${CALENDAR_BASE}/calendars/${calendarId}/events/${opts.eventId}${qs ? `?${qs}` : ""}`;

  const event = await client.request<RawEvent>("PATCH", url, body);
  return { event: mapRawEventToDetail(event) };
}

export async function calendarDeleteEvent(
  client: GoogleClient,
  opts: {
    calendarId?: string;
    eventId: string;
    sendUpdates?: "all" | "externalOnly" | "none";
  },
): Promise<void> {
  const calendarId = encodeURIComponent(opts.calendarId ?? "primary");
  const params = new URLSearchParams();
  if (opts.sendUpdates) params.set("sendUpdates", opts.sendUpdates);
  const qs = params.toString();
  const url = `${CALENDAR_BASE}/calendars/${calendarId}/events/${opts.eventId}${qs ? `?${qs}` : ""}`;
  await client.request<void>("DELETE", url);
}
