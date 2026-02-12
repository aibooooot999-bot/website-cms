import initSqlJs from 'sql.js';
export declare function initDatabase(): Promise<void>;
export declare function getUserByUsername(username: string): any;
export declare function getUserById(id: string): any;
export declare function getAllUsers(): any[];
export declare function createUser(data: {
    id: string;
    username: string;
    password_hash: string;
    display_name?: string;
    email?: string;
    role_id: string;
}): void;
export declare function updateUser(id: string, data: Partial<{
    display_name: string;
    email: string;
    avatar: string;
    role_id: string;
    status: string;
}>): void;
export declare function updateUserPassword(id: string, passwordHash: string): void;
export declare function updateUserLastLogin(id: string): void;
export declare function deleteUser(id: string): void;
export declare function getAllRoles(): any[];
export declare function getRoleById(id: string): any;
export declare function createRole(data: {
    id: string;
    name: string;
    display_name: string;
    description?: string;
    permissions: string[];
}): void;
export declare function updateRole(id: string, data: Partial<{
    display_name: string;
    description: string;
    permissions: string[];
}>): void;
export declare function deleteRole(id: string): void;
export declare function getAllPages(): any[];
export declare function getPageById(id: string): any;
export declare function getPageBySlug(slug: string): any;
export declare function createPage(data: {
    id: string;
    title: string;
    slug: string;
    content?: string;
    excerpt?: string;
    status?: string;
    template?: string;
    meta_title?: string;
    meta_description?: string;
    created_by: string;
}): void;
export declare function updatePage(id: string, data: Partial<{
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    featured_image: string;
    status: string;
    template: string;
    sort_order: number;
    meta_title: string;
    meta_description: string;
    updated_by: string;
}>): void;
export declare function deletePage(id: string): void;
export declare function logActivity(data: {
    id: string;
    user_id: string;
    action: string;
    target_type?: string;
    target_id?: string;
    details?: string;
    ip_address?: string;
}): void;
export declare function getActivityLogs(limit?: number): any[];
export declare function getDashboardStats(): {
    totalPages: any;
    publishedPages: any;
    totalUsers: any;
    recentActivities: any;
};
export declare function getDb(): {
    close(): void;
    create_function(name: string, func: (...args: any[]) => any): /*elided*/ any;
    each(sql: string, params: initSqlJs.BindParams, callback: initSqlJs.ParamsCallback, done: () => void): /*elided*/ any;
    each(sql: string, callback: initSqlJs.ParamsCallback, done: () => void): /*elided*/ any;
    exec(sql: string, params?: initSqlJs.BindParams): initSqlJs.QueryExecResult[];
    export(): Uint8Array;
    getRowsModified(): number;
    handleError(): null | never;
    iterateStatements(sql: string): {
        getRemainingSQL(): string;
        next(): initSqlJs.StatementIteratorResult;
        [Symbol.iterator](): Iterator<{
            bind(values?: initSqlJs.BindParams): boolean;
            free(): boolean;
            freemem(): void;
            get(params?: initSqlJs.BindParams): initSqlJs.SqlValue[];
            getAsObject(params?: initSqlJs.BindParams): initSqlJs.ParamsObject;
            getColumnNames(): string[];
            getNormalizedSQL(): string;
            getSQL(): string;
            reset(): void;
            run(values?: initSqlJs.BindParams): void;
            step(): boolean;
        }>;
    };
    prepare(sql: string, params?: initSqlJs.BindParams): {
        bind(values?: initSqlJs.BindParams): boolean;
        free(): boolean;
        freemem(): void;
        get(params?: initSqlJs.BindParams): initSqlJs.SqlValue[];
        getAsObject(params?: initSqlJs.BindParams): initSqlJs.ParamsObject;
        getColumnNames(): string[];
        getNormalizedSQL(): string;
        getSQL(): string;
        reset(): void;
        run(values?: initSqlJs.BindParams): void;
        step(): boolean;
    };
    run(sql: string, params?: initSqlJs.BindParams): /*elided*/ any;
};
