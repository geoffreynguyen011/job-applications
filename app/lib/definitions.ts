export type user = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    date_created: string;
    degree: string;
    field_of_study: string;
    university: string;
    location: string;
    summary: string;
}

export type company = {
    id: number;
    name: string;
}

export type applications = {
    id: number;
    company_name: string;
    job_posting: number;
}

export type job_postings = {
    id: number;
    company_name: string;
    job_description: string;
    job_title: string;
    availability: string;
    job_length: string;
    location: string;
    currency: string;
    minimum_pay: number;
    maximum_pay: number;
    date_posted: string;
    date_closed: string;
}

export type submitted_applications = {
    user_id: number;
    job_description_id: number;
    application_status: "in_consideration" | "accepted" | "declined";
    date_applied: string;
}