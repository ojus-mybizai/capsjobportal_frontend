export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export const mockUser = {
  id: 1,
  name: "Demo Admin",
  email: "admin@example.com",
  role: "admin",
};

export const mockCompanies = [
  {
    id: 1,
    name: "Acme Corp",
    category: "IT Services",
    location: "Mumbai",
    contact: "Jane Doe, +91-98765 00001",
    company_status: "PAID",
    verification_status: true,
  },
  {
    id: 2,
    name: "Globex Industries",
    category: "Manufacturing",
    location: "Pune",
    contact: "Rahul Verma, +91-98765 00002",
    company_status: "FREE",
    verification_status: false,
  },
  {
    id: 3,
    name: "Innotech Solutions",
    category: "FinTech",
    location: "Bengaluru",
    contact: "Priya Nair, +91-98765 00003",
    company_status: "PAID",
    verification_status: true,
  },
  {
    id: 4,
    name: "Nimbus HR",
    category: "HR Consultancy",
    location: "Delhi",
    contact: "Arjun Mehta, +91-98765 00004",
    company_status: "FREE",
    verification_status: true,
  },
  {
    id: 5,
    name: "Vertex Analytics",
    category: "Analytics",
    location: "Hyderabad",
    contact: "Sonal Gupta, +91-98765 00005",
    company_status: "PAID",
    verification_status: false,
  },
];

export const mockJobs = [
  {
    id: 101,
    title: "Full Stack Developer",
    company_name: "Acme Corp",
    location: "Mumbai",
    status: "OPEN",
    company_id: 1,
    location_area_id: "mumbai",
  },
  {
    id: 102,
    title: "Data Analyst",
    company_name: "Globex Industries",
    location: "Pune",
    status: "OPEN",
    company_id: 2,
    location_area_id: "pune",
  },
  {
    id: 103,
    title: "HR Executive",
    company_name: "Innotech Solutions",
    location: "Bengaluru",
    status: "FULFILLED",
    company_id: 3,
    location_area_id: "bengaluru",
  },
  {
    id: 104,
    title: "Product Manager",
    company_name: "Acme Corp",
    location: "Delhi",
    status: "DROPPED",
    company_id: 1,
    location_area_id: "delhi",
  },
  {
    id: 105,
    title: "QA Engineer",
    company_name: "Vertex Analytics",
    location: "Hyderabad",
    status: "OPEN",
    company_id: 5,
    location_area_id: "hyderabad",
  },
];

export const mockCandidates = [
  {
    id: 201,
    name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone: "+91-90000 00001",
    location: "Mumbai",
    status: "REGISTERED",
    employment_status: "employed",
    location_area_id: "mumbai",
  },
  {
    id: 202,
    name: "Ananya Singh",
    email: "ananya.singh@example.com",
    phone: "+91-90000 00002",
    location: "Pune",
    status: "CAPS",
    employment_status: "unemployed",
    location_area_id: "pune",
  },
  {
    id: 203,
    name: "Mohit Jain",
    email: "mohit.jain@example.com",
    phone: "+91-90000 00003",
    location: "Bengaluru",
    status: "JOC",
    employment_status: "employed",
    location_area_id: "bengaluru",
  },
  {
    id: 204,
    name: "Sara Ali",
    email: "sara.ali@example.com",
    phone: "+91-90000 00004",
    location: "Delhi",
    status: "FREE",
    employment_status: "unemployed",
    location_area_id: "delhi",
  },
  {
    id: 205,
    name: "Vikram Rao",
    email: "vikram.rao@example.com",
    phone: "+91-90000 00005",
    location: "Hyderabad",
    status: "REGISTERED",
    employment_status: "employed",
    location_area_id: "hyderabad",
  },
];

export const mockMappingsByJob = {
  101: [
    {
      id: 301,
      candidate_id: 201,
      candidate_name: "Rahul Sharma",
      candidate_email: "rahul.sharma@example.com",
      candidate_phone: "+91-90000 00001",
      status: "applied",
    },
    {
      id: 302,
      candidate_id: 202,
      candidate_name: "Ananya Singh",
      candidate_email: "ananya.singh@example.com",
      candidate_phone: "+91-90000 00002",
      status: "shortlisted",
    },
    {
      id: 303,
      candidate_id: 203,
      candidate_name: "Mohit Jain",
      candidate_email: "mohit.jain@example.com",
      candidate_phone: "+91-90000 00003",
      status: "interviewed",
    },
    {
      id: 304,
      candidate_id: 204,
      candidate_name: "Sara Ali",
      candidate_email: "sara.ali@example.com",
      candidate_phone: "+91-90000 00004",
      status: "selected",
    },
    {
      id: 305,
      candidate_id: 205,
      candidate_name: "Vikram Rao",
      candidate_email: "vikram.rao@example.com",
      candidate_phone: "+91-90000 00005",
      status: "rejected",
    },
  ],
};

export const mockJobsSummary = {
  openJobs: 8,
  placementsYtd: 15,
  byStatus: [
    { status: "Open", count: 8 },
    { status: "Closed", count: 4 },
    { status: "On Hold", count: 2 },
  ],
  byCompany: [
    { company: "Acme Corp", openJobs: 3 },
    { company: "Globex Industries", openJobs: 2 },
    { company: "Innotech Solutions", openJobs: 3 },
  ],
};

export const mockCandidatesSummary = {
  activeCandidates: 27,
};

export const mockMasters = {
  company_category: [
    { id: 1, name: "IT Services", value: "it_services", label: "IT Services" },
    { id: 2, name: "Manufacturing", value: "manufacturing", label: "Manufacturing" },
    { id: 3, name: "Consulting", value: "consulting", label: "Consulting" },
  ],
  job_category: [
    { id: 1, name: "Engineering", value: "engineering", label: "Engineering" },
    { id: 2, name: "Analytics", value: "analytics", label: "Analytics" },
    { id: 3, name: "Operations", value: "operations", label: "Operations" },
  ],
  job_sub_category: [
    { id: 1, name: "Full Stack", value: "full_stack", label: "Full Stack" },
    { id: 2, name: "Backend", value: "backend", label: "Backend" },
    { id: 3, name: "Frontend", value: "frontend", label: "Frontend" },
  ],
  qualification: [
    { id: 1, name: "B.Tech", value: "btech", label: "B.Tech" },
    { id: 2, name: "MCA", value: "mca", label: "MCA" },
    { id: 3, name: "MBA", value: "mba", label: "MBA" },
  ],
  experience: [
    { id: 1, name: "0-1 years", value: "0-1", label: "0-1 years" },
    { id: 2, name: "1-3 years", value: "1-3", label: "1-3 years" },
    { id: 3, name: "3-5 years", value: "3-5", label: "3-5 years" },
    { id: 4, name: "5+ years", value: "5+", label: "5+ years" },
  ],
  job_type: [
    { id: 1, name: "Full-time", value: "full_time", label: "Full-time" },
    { id: 2, name: "Contract", value: "contract", label: "Contract" },
    { id: 3, name: "Internship", value: "internship", label: "Internship" },
  ],
  skill: [
    { id: 1, name: "JavaScript", value: "javascript", label: "JavaScript" },
    { id: 2, name: "React", value: "react", label: "React" },
    { id: 3, name: "Node.js", value: "nodejs", label: "Node.js" },
    { id: 4, name: "SQL", value: "sql", label: "SQL" },
  ],
  location: [
    { id: 1, name: "Mumbai", value: "mumbai", label: "Mumbai" },
    { id: 2, name: "Pune", value: "pune", label: "Pune" },
    { id: 3, name: "Bengaluru", value: "bengaluru", label: "Bengaluru" },
    { id: 4, name: "Delhi", value: "delhi", label: "Delhi" },
    { id: 5, name: "Hyderabad", value: "hyderabad", label: "Hyderabad" },
  ],
};

export function mockJobPipeline(jobId) {
  const mappings = mockMappingsByJob[jobId] || [];
  return {
    jobId,
    total: mappings.length,
    byStatus: mappings.reduce((acc, m) => {
      const key = String(m.status || "applied").toLowerCase();
      const existing = acc.find((x) => x.status === key);
      if (existing) existing.count += 1;
      else acc.push({ status: key, count: 1 });
      return acc;
    }, []),
  };
}
