import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

// Matches internal/zitadel.SessionResponse serialized by the Go backend.
export interface SessionResponse {
  sessionId: string;
  sessionToken: string;
}

export interface MeResponse {
  userId: string;
  loginName: string;
  displayName: string;
  roles: string[];
  // Presentes desde que /auth/me quedó enriquecido con datos de organizations
  // (Fase 1). Opcionales por si el backend todavía no los manda.
  organizationId?: string;
  organizationName?: string;
  planId?: string;
  isPlatformAdmin?: boolean;
  isSysAdmin?: boolean;
}

export interface LogoutResponse {
  message: string;
}

export interface AuthUrlResponse {
  authUrl: string;
}

export interface IdpCallbackRequest {
  intentId: string;
  intentToken: string;
  userId: string;
}

// ─── Groups & RBAC (Fase 2) — matches internal/groups' JSON shapes ─────────

export type AccessLevel = 'editor' | 'reader';

export interface Group {
  id: string;
  organizationId: string;
  name: string;
  createdAt: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: AccessLevel;
}

export interface GroupSpaceAccess {
  groupId: string;
  spaceId: string;
}

export interface GroupPageAccess {
  groupId: string;
  pageId: string;
}

export interface GroupDetail {
  group: Group;
  members: GroupMember[];
  spaces: GroupSpaceAccess[];
  pages: GroupPageAccess[];
}

// ─── Content (Fase 3) — matches internal/content's JSON shapes ────────────

export type PageCategory = 'tutorial' | 'how_to' | 'reference' | 'explanation' | 'multiple';

export interface Space {
  id: string;
  organizationId: string;
  name: string;
  createdAt: string;
}

export type PageStatus = 'draft' | 'in_review' | 'published';

export interface Page {
  id: string;
  spaceId: string;
  organizationId: string;
  category: PageCategory;
  orderIndex: number;
  title: string;
  status: PageStatus;
  reviewerId?: string;
  sourceType: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Review flow & versioning (RF-FLOW, RF-DOC-08) ────────────────────────

export type VersionTrigger = 'submitted_for_review' | 'approved' | 'rejected';

export interface VersionDiff {
  titleChanged: boolean;
  blocksAdded: number;
  blocksRemoved: number;
  blocksChanged: number;
}

export interface PageVersion {
  id: string;
  pageId: string;
  authorId: string;
  trigger: VersionTrigger;
  diff: VersionDiff;
  comment?: string;
  createdAt: string;
}

export interface TocCategory {
  category: PageCategory;
  pages: Page[];
}

export type BlockType = 'text' | 'code' | 'file' | 'link';

export interface Block {
  id: string;
  orderIndex: number;
  type: BlockType;
  content: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

export type LinkType = 'reference' | 'embed';

export interface PageLink {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  linkType: LinkType;
  createdAt: string;
}

export interface PageDetail {
  page: Page;
  blocks: Block[];
  links: PageLink[];
}

// ─── Grafo de nodos (RF-NODE-04) ───────────────────────────────────────

export interface GraphNode {
  id: string;
  title: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface SpaceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type FileType = 'pdf' | 'word' | 'txt' | 'markdown' | 'excel';

export interface Attachment {
  id: string;
  blockId: string;
  organizationId: string;
  fileName: string;
  fileType: FileType;
  fileSizeBytes: number;
  storageRef: string;
  uploadedBy: string;
  createdAt: string;
}

// ─── Organizations — matches internal/organizations.User's JSON shape ─────

export type UserStatus = 'active' | 'inactive';

export interface OrgUser {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  isSysAdmin: boolean;
  status: UserStatus;
  lastAccessAt?: string;
  createdAt: string;
}

// ─── Planes y consumo (RF-PLAN-01/02/03) ──────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  maxSpaces: number | null;
  maxPages: number | null;
  maxStorageBytes: number;
  maxMembers: number;
  maxGroups: number | null;
  graphViewLevel: string;
  versionRetentionDays: number | null;
  maxGitRepos: number;
  allowsIntegrations: boolean;
  allowsWhiteLabel: boolean;
}

export interface OrgUsage {
  organization: {
    id: string;
    name: string;
    planId: string;
    isPersonal: boolean;
    storageUsedBytes: number;
    status: string;
    createdAt: string;
  };
  plan: Plan;
  usage: {
    spaces: number;
    pages: number;
    groups: number;
    members: number;
    storageUsedBytes: number;
  };
}

// ─── Invitaciones (RF-AUTH-06, RF-USR-02) ─────────────────────────────────

export type InvitationStatus = 'pending' | 'accepted';

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  invitedBy: string;
  status: InvitationStatus;
  createdAt: string;
  acceptedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(body: LoginRequest): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.base}/auth/login`, {
      loginName: body.username,
      password: body.password,
    });
  }

  register(body: RegisterRequest): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.base}/auth/register`, body);
  }

  logout(sessionId: string, sessionToken: string): Observable<LogoutResponse> {
    return this.http.post<LogoutResponse>(`${this.base}/auth/logout`, {
      sessionId,
      sessionToken,
    });
  }

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.base}/auth/me`);
  }

  googleLogin(): Observable<AuthUrlResponse> {
    return this.http.get<AuthUrlResponse>(`${this.base}/auth/google`);
  }

  githubLogin(): Observable<AuthUrlResponse> {
    return this.http.get<AuthUrlResponse>(`${this.base}/auth/github`);
  }

  idpCallback(body: IdpCallbackRequest): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.base}/auth/idp/callback`, body);
  }

  /** Only works against a backend running with DEV_AUTH_BYPASS=true (404 otherwise). */
  devLogin(): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.base}/auth/dev-login`, {});
  }

  // ─── Groups & RBAC ────────────────────────────────────────────────────

  createGroup(name: string): Observable<Group> {
    return this.http.post<Group>(`${this.base}/groups`, { name });
  }

  listGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.base}/groups`);
  }

  getGroup(groupId: string): Observable<GroupDetail> {
    return this.http.get<GroupDetail>(`${this.base}/groups/${groupId}`);
  }

  renameGroup(groupId: string, name: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/groups/${groupId}`, { name });
  }

  deleteGroup(groupId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/groups/${groupId}`);
  }

  addGroupMember(groupId: string, userId: string, role: AccessLevel): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/groups/${groupId}/members`, { userId, role });
  }

  changeGroupMemberRole(groupId: string, userId: string, role: AccessLevel): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/groups/${groupId}/members/${userId}`, { role });
  }

  removeGroupMember(groupId: string, userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/groups/${groupId}/members/${userId}`);
  }

  grantGroupSpaceAccess(groupId: string, spaceId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/groups/${groupId}/spaces`, { spaceId });
  }

  revokeGroupSpaceAccess(groupId: string, spaceId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/groups/${groupId}/spaces/${spaceId}`);
  }

  grantGroupPageAccess(groupId: string, pageId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/groups/${groupId}/pages`, { pageId });
  }

  revokeGroupPageAccess(groupId: string, pageId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/groups/${groupId}/pages/${pageId}`);
  }

  // ─── Content — Spaces ───────────────────────────────────────────────────

  createSpace(name: string): Observable<Space> {
    return this.http.post<Space>(`${this.base}/spaces`, { name });
  }

  listSpaces(): Observable<Space[]> {
    return this.http.get<Space[]>(`${this.base}/spaces`);
  }

  getSpace(spaceId: string): Observable<Space> {
    return this.http.get<Space>(`${this.base}/spaces/${spaceId}`);
  }

  renameSpace(spaceId: string, name: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/spaces/${spaceId}`, { name });
  }

  deleteSpace(spaceId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/spaces/${spaceId}`);
  }

  // ─── Content — Pages ────────────────────────────────────────────────────

  createPage(spaceId: string, category: PageCategory, title: string): Observable<Page> {
    return this.http.post<Page>(`${this.base}/spaces/${spaceId}/pages`, { category, title });
  }

  listPagesBySpace(spaceId: string): Observable<TocCategory[]> {
    return this.http.get<TocCategory[]>(`${this.base}/spaces/${spaceId}/pages`);
  }

  getPage(pageId: string): Observable<PageDetail> {
    return this.http.get<PageDetail>(`${this.base}/pages/${pageId}`);
  }

  updatePage(pageId: string, body: { title?: string; category?: PageCategory }): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/pages/${pageId}`, body);
  }

  reorderPage(pageId: string, newIndex: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/pages/${pageId}/order`, { newIndex });
  }

  submitForReview(pageId: string, reviewerId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/pages/${pageId}/submit-review`, { reviewerId });
  }

  approvePage(pageId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/pages/${pageId}/approve`, {});
  }

  rejectPage(pageId: string, comment: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/pages/${pageId}/reject`, { comment });
  }

  listVersions(pageId: string): Observable<PageVersion[]> {
    return this.http.get<PageVersion[]>(`${this.base}/pages/${pageId}/versions`);
  }

  getBacklinks(pageId: string): Observable<Page[]> {
    return this.http.get<Page[]>(`${this.base}/pages/${pageId}/backlinks`);
  }

  getSpaceGraph(spaceId: string): Observable<SpaceGraph> {
    return this.http.get<SpaceGraph>(`${this.base}/spaces/${spaceId}/graph`);
  }

  listSpaceEditors(spaceId: string): Observable<OrgUser[]> {
    return this.http.get<OrgUser[]>(`${this.base}/spaces/${spaceId}/editors`);
  }

  deletePage(pageId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/pages/${pageId}`);
  }

  // ─── Content — Blocks & Attachments ────────────────────────────────────

  replaceBlocks(pageId: string, blocks: Block[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/pages/${pageId}/blocks`, { blocks });
  }

  uploadAttachment(blockId: string, file: File): Observable<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Attachment>(`${this.base}/blocks/${blockId}/attachments`, formData);
  }

  downloadAttachment(attachmentId: string): Observable<Blob> {
    return this.http.get(`${this.base}/attachments/${attachmentId}`, { responseType: 'blob' });
  }

  deleteAttachment(attachmentId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/attachments/${attachmentId}`);
  }

  // ─── Content — Search ───────────────────────────────────────────────────

  search(query: string): Observable<Page[]> {
    return this.http.get<Page[]>(`${this.base}/search`, { params: { q: query } });
  }

  // ─── Organizations ────────────────────────────────────────────────────

  listUsers(): Observable<OrgUser[]> {
    return this.http.get<OrgUser[]>(`${this.base}/users`);
  }

  setUserStatus(userId: string, status: UserStatus): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/organizations/users/${userId}/status`, { status });
  }

  deleteUser(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/organizations/users/${userId}`);
  }

  listInvitations(): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`${this.base}/organizations/invitations`);
  }

  createInvitation(email: string): Observable<Invitation> {
    return this.http.post<Invitation>(`${this.base}/organizations/invitations`, { email });
  }

  revokeInvitation(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/organizations/invitations/${id}`);
  }

  getUsage(): Observable<OrgUsage> {
    return this.http.get<OrgUsage>(`${this.base}/organizations/usage`);
  }

  listPlans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.base}/organizations/plans`);
  }

  changePlan(planId: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/organizations/plan`, { planId });
  }
}
