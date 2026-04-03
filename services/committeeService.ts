// Parliamentary Standing Committees Service
import { MP } from '@/services/gameEngine';
import { Bill } from '@/services/billService';

export interface CommitteeStudy {
  id: string;
  title: string;
  topic: string;
  launchedWeek: number;
  status: 'ongoing' | 'completed';
  reportSummary?: string;
}

export interface Committee {
  id: string;
  code: string;
  name: string;
  mandate: string;
  members: string[]; // MP IDs
  chairId: string | null; // MP ID
  billsUnderReview: string[]; // bill IDs
  activeStudies: CommitteeStudy[];
}

export const STANDING_COMMITTEES: Omit<Committee, 'members' | 'chairId' | 'billsUnderReview' | 'activeStudies'>[] = [
  {
    id: 'fina', code: 'FINA', name: 'Standing Committee on Finance',
    mandate: 'Review federal budget, estimates, and taxation policy; produce spending recommendations.',
  },
  {
    id: 'just', code: 'JUST', name: 'Standing Committee on Justice and Human Rights',
    mandate: 'Examine justice statutes, legal rights frameworks and criminal law reform.',
  },
  {
    id: 'huma', code: 'HUMA', name: 'Standing Committee on Human Resources, Skills and Social Development and the Status of Persons with Disabilities',
    mandate: 'Monitor employment, social services, disability supports and labour policy.',
  },
  {
    id: 'proc', code: 'PROC', name: 'Standing Committee on Procedure and House Affairs',
    mandate: 'Manage House procedure, order, and electoral law review.',
  },
  {
    id: 'pacc', code: 'PACP', name: 'Standing Committee on Public Accounts',
    mandate: 'Assess Public Accounts and Auditor General reports for value-for-money and government accountability.',
  },
  {
    id: 'faae', code: 'FAAE', name: 'Standing Committee on Foreign Affairs and International Development',
    mandate: 'Scrutinize foreign policy, international aid, and global security commitments.',
  },
  {
    id: 'nati', code: 'NATI', name: 'Standing Committee on National Defence',
    mandate: 'Examine military operations, procurement and sovereignty-related defence policy.',
  },
  {
    id: 'envi', code: 'ENVI', name: 'Standing Committee on Environment and Sustainable Development',
    mandate: 'Evaluate environmental protection law, climate policy and sustainability initiatives.',
  },
  {
    id: 'heaa', code: 'HEAA', name: 'Standing Committee on Health',
    mandate: 'Review federal health care policy, health funding, and public health emergencies.',
  },
  {
    id: 'indre', code: 'INDR', name: 'Standing Committee on Indigenous and Northern Affairs',
    mandate: 'Address Indigenous reconciliation, northern development, and related statutes.',
  },
];

export function initCommittees(): Committee[] {
  return STANDING_COMMITTEES.map(template => ({
    ...template,
    members: [],
    chairId: null,
    billsUnderReview: [],
    activeStudies: [],
  }));
}

export function assignCommitteesToMPs(mps: MP[]): Committee[] {
  const sortedMPs = [...mps].sort((a, b) => b.loyalty - a.loyalty);
  const committees = initCommittees();
  return committees.map((committee, index) => {
    const memberCount = Math.max(8, Math.round(mps.length / committees.length));
    const start = index * memberCount;
    const assigned = sortedMPs.slice(start, start + memberCount).map(mp => mp.id);
    return {
      ...committee,
      members: assigned,
      chairId: assigned[0] || null,
    };
  });
}

export function launchCommitteeStudy(committee: Committee, topic: string, week: number): Committee {
  const study: CommitteeStudy = {
    id: `${committee.id}_study_${Date.now()}`,
    title: `${committee.name} Study on ${topic}`,
    topic,
    launchedWeek: week,
    status: 'ongoing',
  };
  return {
    ...committee,
    activeStudies: [...committee.activeStudies, study],
  };
}

export function assignBillToCommittee(committee: Committee, bill: Bill): Committee {
  if (committee.billsUnderReview.includes(bill.id)) return committee;
  return { ...committee, billsUnderReview: [...committee.billsUnderReview, bill.id] };
}

export function completeCommitteeStudy(committee: Committee, studyId: string, summary: string): Committee {
  return {
    ...committee,
    activeStudies: committee.activeStudies.map(study =>
      study.id === studyId
        ? { ...study, status: 'completed' as const, reportSummary: summary }
        : study
    ),
  };
}

export function advanceCommitteeWork(committee: Committee, week: number): Committee {
  const updatedStudies = committee.activeStudies.map(study => {
    if (study.status === 'ongoing' && week - study.launchedWeek >= 3) {
      return {
        ...study,
        status: 'completed' as const,
        reportSummary: `The ${study.title} has reported its findings and recommendations.`,
      };
    }
    return study;
  });
  return { ...committee, activeStudies: updatedStudies };
}
