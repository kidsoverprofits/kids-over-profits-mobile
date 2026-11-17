/**
 * Shapes of the kop/v1 responses the app reads. The facility, operator and news routes are
 * inc/mobile-api.php in the Kids-Over-Profits theme; the rest are older public routes.
 * Sections that are empty for most records are optional and read defensively.
 */

export type Link = { url: string; label: string; live_url?: string; go_url?: string };

export type Source = { source: string; cite?: string; url?: string };

export type Fact = { label: string; value: string };

export type NewsImage = { src: string; kind: 'photo' | 'logo' } | null;

export type NewsFacility = { id: number; name: string; slug: string; url: string };

/** One article as the feed and the facility and company pages draw it. */
export type NewsItem = {
  id: number;
  title: string;
  outlet: string;
  date: string;
  date_label: string;
  url: string;
  type: string;
  summary: string;
  content_warnings?: string[];
  image: NewsImage;
  facilities?: NewsFacility[];
  story_arc?: { title: string; slug: string } | null;
  story_group_id?: number | null;
  link_type?: string;
  about?: string;
  /** A celebrity or viral story: the record pages fold it apart. */
  aside?: boolean;
  /** The article names the program only in passing: folded apart, not counted (inc/news-passing.php). */
  passing?: boolean;
};

export type StoryArc = {
  id: number;
  title: string;
  slug: string;
  description: string;
  status: string;
  article_count: number;
  latest_date: string;
  facility: { label: string; url: string } | null;
};

export type NewsFeed = {
  items: NewsItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  months: { month: string; count: number }[];
  arcs: StoryArc[];
  story: StoryArc | null;
};

export type NewsQuery = { archive?: string; story?: string; facility?: number };

export type StaffEntry = {
  text: string;
  source?: string;
  cite?: string;
  url?: string;
  name?: string;
  role?: string;
  career?: { text?: string; label?: string; name?: string; url?: string; role?: string; place?: string; years?: string; kind?: string }[];
  from_map?: boolean;
  /** Family, business partners (the site's kop-fp-person-relations line). */
  relations?: { kind?: string; name?: string; url?: string }[];
};

export type Incident = {
  when?: string;
  kind?: string;
  text: string;
  source?: string;
  cite?: string;
  url?: string;
  also?: Source[];
};

export type LawsuitRow = {
  id?: number;
  case_name: string;
  case_number?: string;
  court?: string;
  year?: string;
  status?: string;
  outcome?: string;
  summary?: string;
  link_type?: string;
};

export type MemorialRow = {
  id?: number;
  name: string;
  age?: string;
  program?: string;
  date?: string;
  date_label?: string;
  cause?: string;
  category?: string;
  source_name?: string;
  source_url?: string;
  kop_url?: string;
};

export type InspectionReport = {
  id: number;
  date: string;
  date_label: string;
  url: string;
  summary: string;
  report_id: string;
  licensed_as: string;
  findings: { text: string; standard: string; label: string }[];
};

export type InspectionSummary = {
  licensed_names: string[];
  addresses: string[];
  phone: string;
  program_category: string;
  licensed_program_name: string;
  executive_director: string;
  bed_capacity: string;
  license_expiration: string;
  relicense_visit_date: string;
  licensing_action: string;
  states: string[];
};

export type FacilityInspections = {
  summary: InspectionSummary | null;
  total: number;
  reports: InspectionReport[];
  more: number;
  /** Approved serious findings, the page's "Serious violations" section. */
  violations?: SeriousFinding[];
  page_url: string;
};

/** An approved serious finding (kop_facility_pages_violations in the theme). */
export type SeriousFinding = {
  id: number;
  state?: string;
  category?: string;
  label: string;
  kinds?: string[];
  weight?: number;
  severe?: boolean;
  date?: string;
  date_label?: string;
  excerpt?: string;
  short?: string;
  state_label?: string;
  source_url?: string;
  full_url?: string;
  home?: string;
  home_url?: string;
};

export type Sibling = { name: string; place: string; status: string; url: string };

/** A kind of material the project holds for the record, not online (kop_facility_pages_resources_held()). */
export type HeldResource = {
  label: string;
  group: string;
  detail: string;
  /** The resources.* flag ("hasLawsuits"); empty for a custom entry or a note. */
  key?: string;
  /** Page sections it links to under "At a glance", best first (kop_facility_pages_resource_anchors()). */
  anchors?: string[];
};

export type ResourceLinkGroup = { kind: string; label: string; links: Link[] };

/** What one name of a renamed program holds, its own record's and the other names' (inc/facility-eras.php). */
export type EraLists = {
  memorials: MemorialRow[];
  violations: SeriousFinding[];
  lawsuits: LawsuitRow[];
  incidents: Incident[];
  news: NewsItem[];
  staff: Record<string, StaffEntry[]>;
};
export type EraKind = keyof EraLists;

export type Era = EraLists & {
  /** The section's anchor on the website ("as-copper-canyon-academy"). */
  id: string;
  name: string;
  /** "1998 to 2014", "from 2014", "until 2000". */
  years: string;
  operators: string[];
  /** The record kept under this name when it is another record's; empty for this one. */
  url: string;
};

/** A renamed program's page cut into one section per name; `rest` is what no name took, `totals` the whole page's counts. */
export type FacilityEras = { list?: Era[]; rest?: Partial<EraLists>; totals?: Partial<Record<EraKind, number>> };

/** One sentence of an About and its citations (inc/profile-notes.php; a published write-up keeps its own). */
export type AboutSentence = { text: string; sources: { url: string; cite: string }[] };
/**
 * The record's "About": paragraphs of cited sentences, then "Also drawn on" links. `writeup` is true when it is the
 * record's published write-up (Claude's About rewrites, inc/about-rewrites.php) rather than prose built from notes.
 */
export type About = {
  paragraphs: AboutSentence[][];
  also?: { url: string; label: string; cite?: string }[];
  writeup?: boolean;
};

/** A survivor's own account on the page: who it is from, where it was published, and (when it names staff) a note. */
export type TestimonyItem = {
  text: string;
  date_label?: string;
  submitted?: boolean;
  credit?: string;
  url?: string;
  note?: string;
};

/** What a reader who was there told the questions page, in their own words (inc/reader-accounts.php). */
export type ReaderQuote = { text: string; credit: string; staff: string[] };

/** A line from the program's own handbook or papers, under its topic (inc/program-practices.php). */
export type RuleGroup = {
  topic: string;
  label: string;
  lines: { text: string; source_url: string; source_title: string; page: number; year: number }[];
};

/** One year of the page timeline (inc/profile-timeline.php), oldest first. */
export type PageTimelineEvent = {
  kind: string;
  label: string;
  group: string;
  when: string;
  title: string;
  lead: string;
  items: string[];
  detail: string[];
  sources: { url: string; cite: string }[];
  major: boolean;
};
export type PageTimelineYear = { year: number; events: PageTimelineEvent[] };

/** An organization's IRS Form 990 filings (inc/nonprofit-filings.php); amounts in dollars, null when not filed. */
export type NonprofitOrg = {
  name: string;
  ein_label: string;
  place: string;
  kind: string;
  since: string;
  url: string;
  years: string;
  filings: { year: number; form: string; revenue: number | null; expenses: number | null; officer_pay: number | null; assets: number | null; pdf: string }[];
};

/** A company's state business filing (inc/business-filings.php), worded as the website words it. */
export type BusinessEntity = {
  name: string;
  state: string;
  summary: string;
  url: string;
  address: string;
  officers: { name: string; title: string; where: string }[];
  more_officers: boolean;
  agent: { name: string; where: string } | null;
  events: { date: string; what: string; name: string; notes: string; url: string }[];
  trade_names: { name: string; note: string }[];
};

/** Research by others with a page on the program or company (inc/outside-research.php): "Further research". */
export type OutsideResearch = { name: string; url: string; by: string; note: string };

/** A document in our research library that names the program, under Documents. */
export type ResearchDoc = { title: string; url: string; byline: string; why: string; pages: string; library: string };

/** Files about the program that Unsilenced or a survivor site published and KOP does not hold, worded as the website words them. */
export type SourceArchive = {
  label: string;
  url: string;
  intro: string;
  folders: { name: string; url: string }[];
  groups: { name: string; files: { title: string; url: string; note: string }[] }[];
};

/**
 * A hand-written Facility Profile post about the program. Paragraph text carries links as [words](address).
 * `kind` is the record section a post section joins on the website ('testimony', 'news', 'lawsuits', 'documents',
 * 'videos', 'related'), or 'prose' for its own written sections. `merged`: the website prints it inside the record's
 * page (Hyde School); otherwise the post is the website's page for the program.
 */
export type ProfilePost = {
  url: string;
  title: string;
  merged: boolean;
  updated: string;
  lead: string[];
  facts: { label: string; lines: string[] }[];
  sections: {
    id: string;
    title: string;
    kind: string;
    paragraphs: string[];
    links: { title: string; url: string; summary: string; outlet: string }[];
  }[];
};

/** Federal money the program is on record as taking, by stream (Medicaid, child welfare funds, ...). */
export type FundingStream = {
  stream: string;
  label: string;
  entries: { detail: string; years?: string; sources: { url: string; label: string }[] }[];
};

/** Separate programs on the same campus (inc/campus-programs.php); a program and its school are one too. */
export type CampusInfo = {
  /** The campus's own name ("the Cross Creek campus"), or ''. */
  name?: string;
  /** role 'school': the academic program of one of them. */
  others: { id?: number; name: string; url: string; place?: string; status?: string; years?: string; role?: string }[];
  school_of?: unknown[];
  schools?: unknown[];
} | null;

export type FacilityPayload = {
  api_version: number;
  id: number;
  slug: string;
  url: string;
  name: string;
  unique_name: string;
  current_name: string;
  formerly: string[];
  /** The years beside a past name, keyed by the name (an empty list when none has years). */
  formerly_years?: Record<string, string> | string[];
  /** Names the program went by after this record's ("Later called"). */
  later?: string[];
  aka: string[];
  status: string;
  end_year: string;
  place: string;
  city: string;
  state_code: string;
  state_name: string;
  country: string;
  hub_name: string;
  hub_url: string;
  operator: { name: string; url: string };
  siblings: Sibling[];
  program_homes: { homes?: { id: number; name: string; home_name?: string; place?: string; status?: string; years?: string; url: string }[] } | null;
  home_of: { count: number; program: { name: string; url: string }; others?: Sibling[] } | null;
  campus?: CampusInfo;
  addresses: string[];
  former_locations: { line: string; years: string }[];
  operated: string;
  summary: string;
  facts: Fact[];
  fact_sources: Record<string, Source[]>;
  practices: { label: string; items: string[] }[];
  incidents: Incident[];
  staff: Record<string, StaffEntry[]> | StaffEntry[];
  notes: string[];
  about?: About | null;
  field_notes: { label: string; text: string }[];
  testimony: TestimonyItem[];
  /** Readers' accounts from the questions page: their rules under Rules and practices, the rest under testimony. */
  readers?: ReaderQuote[];
  reader_rules?: ReaderQuote[];
  questions_url?: string;
  rules?: RuleGroup[];
  timeline?: PageTimelineYear[];
  federal_funding?: FundingStream[];
  nonprofits?: NonprofitOrg[];
  businesses?: BusinessEntity[];
  /** A program made from a company record keeps the company's published history. */
  history?: { status: string; paragraphs: string[]; sources: { label: string; url: string }[] } | null;
  research?: ResearchDoc[];
  archives?: SourceArchive[];
  outside_research?: OutsideResearch[];
  profile?: ProfilePost | null;
  forum: { incidents?: Incident[]; leads?: string[]; links?: { url: string; label: string }[] } | null;
  videos: { provider: string; id: string; title: string; url: string; source: string; thumb: string }[];
  profile_links: Link[];
  resources: HeldResource[];
  resource_links: ResourceLinkGroup[];
  news: NewsItem[];
  lawsuits: LawsuitRow[];
  memorials: MemorialRow[];
  eras: FacilityEras | null;
  wiki: { id: number; title: string; place: string; organization: string; type: string; years: string }[];
  inspections: FacilityInspections | null;
  documents: { folder_id: number; url: string };
  /** The facility's names on the network map (inc/mobile-api.php kop_mobile_facility_network()); null when the map does not draw it. */
  network?: FacilityNetwork | null;
  updated_at: string;
  updated_label: string;
  news_url: string;
  lawsuits_url: string;
  memorial_url: string;
  wiki_url: string;
  submit_url: string;
};

export type OperatorFacility = {
  id: number;
  name: string;
  place: string;
  status: string;
  years: string;
  url: string;
  has_page: boolean;
  start_year?: number | null;
  end_year?: number | null;
  own_years?: boolean;
};

export type OperatorPayload = {
  api_version: number;
  id: number;
  name: string;
  full_name: string;
  url: string;
  aka: string[];
  current_name: string;
  /** The record's name, when the page is titled by the popular name it uses now (operator.popularName). */
  formerly?: string[];
  status: string;
  facts: Fact[];
  parents: { name: string; url: string }[];
  subsidiaries: { name: string; url: string }[];
  facilities: OperatorFacility[];
  program_tree: (OperatorFacility & { homes: OperatorFacility[] })[];
  open_count: number;
  place_count: number;
  /** US states and other countries, counted apart (place_count is both). */
  state_count?: number;
  country_count?: number;
  lawsuits: LawsuitRow[];
  memorials: MemorialRow[];
  websites: Link[];
  notes: string[];
  about?: About | null;
  nonprofits?: NonprofitOrg[];
  businesses?: BusinessEntity[];
  /** Programs it runs or ran that are not troubled teen programs, by the category they are listed under. */
  related?: { id: number; name: string; url: string; label: string; place: string; status: string; past: boolean }[];
  resource_links?: ResourceLinkGroup[];
  outside_research?: OutsideResearch[];
  timeline: { year?: string | number; label?: string; text?: string; url?: string; kind?: string }[];
  people: {
    leaders: { name: string; role: string; career?: unknown[]; personId?: number }[];
    others: { name: string; role: string; career?: unknown[]; personId?: number }[];
  };
  summary: string;
  index_url: string;
  network_url: string;
  updated_label: string;
  news: NewsItem[];
  history: { status: string; paragraphs: string[]; sources: { label: string; url: string }[] } | null;
  documents: { folder_id: number; program_total: number; url: string };
};

/** One name the map ties to a facility. `group` is the website's Network heading; people are 'People'. */
export type NetworkLink = {
  node: string;
  name: string;
  /** person, facility, parent, association, government, church, other */
  kind: string;
  group: string;
  role: string;
  /** became / formerly (renames), acquired / acquired by, or '' */
  relation: string;
  /** The name's own page (facility or company), or ''. */
  url: string;
};

export type FacilityNetwork = { node: string; name: string; map_url: string; links: NetworkLink[] };

/** kop/v1/facility-suggest */
export type SuggestItem = { id?: number; name: string; place: string; status: string; hint: string; url?: string };
export type SuggestResponse = { query: string; items: SuggestItem[] };

/**
 * kop/v1/mobile/suggest (kop_mobile_suggest()): facilities and companies matching by a current, past or other
 * name. `hint` says which other name matched ("Formerly X"); `slug` opens the app's own screen ('' when the
 * record has no page). Facilities come first.
 */
export type SuggestKind = 'facility' | 'operator';
export type AppSuggestItem = {
  kind: SuggestKind;
  id: number;
  name: string;
  hint: string;
  place: string;
  status: string;
  slug: string;
  url: string;
  /** Its other names (the one that matched first) and its other and former places (since 2026-11-13). */
  names?: string[];
  places?: string[];
};
export type AppSuggestResponse = { query: string; items: AppSuggestItem[] };

/** kop/v1/global-search */
export type GlobalSearchItem = {
  title: string;
  url: string;
  meta?: string;
  kind?: string;
  /** Its other names (the one that matched first) and its other and former places, a line each under the result. */
  names?: string[];
  places?: string[];
};
export type GlobalSearchGroup = { key: string; label: string; items: GlobalSearchItem[] };
export type GlobalSearchResponse = { query: string; total: number; groups: GlobalSearchGroup[] };

/** kop/v1/operators: every company page, one line each, A to Z (kop_mobile_operators()). */
export type OperatorListItem = {
  id: number;
  slug: string;
  name: string;
  url: string;
  programs: number;
  open: number;
  /** State codes, or a country's name outside the US. */
  places: string[];
  /** "Founded 2005" or "Programs from 2004", else empty. */
  years: string;
  status: string;
  /** Five or more programs, a published history or a large place on the map. */
  major: boolean;
  /**
   * Still operating (kop_operator_history_is_active()): the stated status, else an open program;
   * false for one closed, merged or acquired, or whose programs on record have all closed.
   */
  active: boolean;
};
export type OperatorsList = { api_version: number; total: number; items: OperatorListItem[] };

/** kop/v1/resources: the /resources/ page's list (inc/resources-list.php, kop_resources_groups()). */
export type ResourceEntry = {
  name: string;
  /** '' for a phone-only entry. */
  url: string;
  /** A page on the site ('report-abuse', 'tti-data-submission'), '' for an outside link. */
  page: string;
  /** "Call or text 988", printed in bold. */
  contact: string;
  note: string;
  /** The live site is gone; the link is a snapshot. */
  archived: boolean;
  links: { label: string; url: string }[];
};
export type ResourceGroup = { heading: string; intro: string; entries: ResourceEntry[] };
export type ResourcesPayload = { api_version: number; url: string; total: number; groups: ResourceGroup[] };

/** kop/v1/state/<slug> (the parts the app lists) */
export type StateTile = {
  name: string;
  city: string;
  state: string;
  status: string;
  operator_name: string;
  operating_period: string;
  profile_url: string;
  facility_ids: number[];
  inspection_count?: number;
  violation_count?: number;
};
export type StatePage = {
  state: { name: string; slug: string };
  inspections: { has_reports: boolean; page_url: string | null };
  facilities: { active: StateTile[]; closed: StateTile[]; total: number };
  news: { id: number; article_title: string; display_title: string; publication_name: string; publication_date: string; article_url: string; article_type: string; summary: string }[];
  lawsuits: { id: number; case_name: string; case_number?: string; court?: string; status?: string; summary?: string }[];
  counts: Record<string, number>;
};

/** Send to KOP: kop/v1/mobile/* (public) and kop/v1/extension/* (reviewers signed in). */
export type LinkType = 'article' | 'lawsuit' | 'legislation' | 'website';
export type FacilityType = 'facility_new' | 'facility_correction';
export type SubmitType = LinkType | FacilityType;

/** Everything the Send screen can fill in. Empty strings are left out of the request. */
export type SubmitDraft = {
  type: SubmitType;
  url: string;
  title: string;
  site_name: string;
  author: string;
  published: string;
  case_number: string;
  court: string;
  bill_number: string;
  jurisdiction: string;
  session: string;
  facility: string;
  facility_id: number | null;
  notes: string;
  selection: string;
  submitter_name: string;
  notify_email: string;
  newsletter_email: string;
  // facility_new only
  name: string;
  other_names: string[];
  city: string;
  state: string;
  country: string;
  operator: string;
  start_year: string;
  end_year: string;
  website: string;
  program_type: string;
};

export type Credentials = { username: string; appPassword: string };

export type DuplicateInfo = { type: string; status: string; id?: number; title?: string };
export type DuplicateCheck = { duplicate: boolean; duplicates: DuplicateInfo[] };

export type SubmitOutcome =
  | { kind: 'ok'; queue: string }
  | { kind: 'duplicate'; message: string; duplicates: DuplicateInfo[] }
  | { kind: 'error'; message: string };

/** kop/v1/facility/<slug>/documents and kop/v1/operator/<slug>/documents: the page's document library. */
export type DocFile = { id: number; title: string; url: string; ext: string; mime: string; size: number; thumb: string };
export type DocFolder = { name: string; merged_from: string; count: number; files: DocFile[]; folders: DocFolder[] };
export type DocumentsPayload = {
  api_version: number;
  kind: 'facility' | 'operator';
  name: string;
  page_url: string;
  total: number;
  files: DocFile[];
  folders: DocFolder[];
  /** A company's programs with libraries of their own. */
  programs: { name: string; slug: string; count: number }[];
};
