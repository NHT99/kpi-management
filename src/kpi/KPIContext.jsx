import { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import {
  INITIAL_PERSONAL_KPIS,
  INITIAL_DEPT_STAFF,
  INITIAL_DEPT_SUMMARIES,
} from './kpiData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { INITIAL_AGENCY_APPROVALS } from './data/mockKPIData';

const KPIContext = createContext(null);

export function KPIProvider({ children }) {
  const [personalKPIs, setPersonalKPIs] = useState(INITIAL_PERSONAL_KPIS);
  const [deptStaff, setDeptStaff] = useState(INITIAL_DEPT_STAFF);
  const [deptSummaries, setDeptSummaries] = useState(INITIAL_DEPT_SUMMARIES);
  const [agencyApprovals, setAgencyApprovals] = useLocalStorage(
    'kpi_agency_approval',
    INITIAL_AGENCY_APPROVALS
  );

  const agencyApproval = agencyApprovals['Q3_2026'] || {
    isApproved: false,
    decisionNumber: '128/QĐ-BQL',
    approvalDate: null,
    councilNote: 'Hội đồng đánh giá thống nhất biểu quyết 100% công nhận kết quả thẩm định.',
    signer: 'Lê Hoàng Long - Phó Giám đốc Ban',
  };

  // Action for Cán bộ / Chuyên viên: Cập nhật tiến độ KPI cá nhân
  const updateKPIProgress = (kpiId, data) => {
    setPersonalKPIs((prev) =>
      prev.map((kpi) => {
        if (kpi.id === kpiId) {
          return {
            ...kpi,
            progress: Number(data.progress ?? kpi.progress),
            currentValue: Number(data.currentValue ?? kpi.currentValue),
            proofUrl: data.proofUrl ?? kpi.proofUrl,
            proofNote: data.proofNote ?? kpi.proofNote,
          };
        }
        return kpi;
      })
    );
  };

  // Action for Cán bộ / Chuyên viên: Tự đánh giá KPI cá nhân
  const submitSelfEvaluation = (kpiId, data) => {
    setPersonalKPIs((prev) =>
      prev.map((kpi) => {
        if (kpi.id === kpiId) {
          return {
            ...kpi,
            selfScore: Number(data.selfScore ?? kpi.selfScore),
            selfComment: data.selfComment ?? kpi.selfComment,
            status: 'SELF_EVALUATED',
          };
        }
        return kpi;
      })
    );
  };

  // Action for Cán bộ / Chuyên viên: Gửi toàn bộ bản tự đánh giá lên Trưởng phòng
  const submitAllSelfEvaluations = () => {
    setPersonalKPIs((prev) =>
      prev.map((kpi) => ({
        ...kpi,
        status: 'SELF_EVALUATED',
      }))
    );
    // Update Nguyen Van An in deptStaff
    setDeptStaff((prev) =>
      prev.map((s) => (s.id === 'staff-01' ? { ...s, status: 'SUBMITTED' } : s))
    );
  };

  // Action for Trưởng / Phó phòng: Đánh giá, chấm điểm công chức thuộc phòng
  const gradeStaff = (staffId, data) => {
    setDeptStaff((prev) =>
      prev.map((staff) => {
        if (staff.id === staffId) {
          return {
            ...staff,
            managerScore: Number(data.managerScore ?? staff.managerScore),
            preliminaryRating: data.preliminaryRating ?? staff.preliminaryRating,
            managerComment: data.managerComment ?? staff.managerComment,
            status: 'REVIEWED',
          };
        }
        return staff;
      })
    );
  };

  // Action for Trưởng / Phó phòng: Trình kết quả đánh giá phòng lên Hội đồng Ban
  const submitDeptToCouncil = (deptId = 'dept_khtc') => {
    setDeptSummaries((prev) =>
      prev.map((d) => (d.id === deptId ? { ...d, status: 'PENDING_COUNCIL' } : d))
    );
  };

  // Action for Lãnh đạo Ban / Hội đồng: Thẩm định & Phê duyệt kết quả toàn cơ quan
  const approveAgencyResults = ({ decisionNumber, councilNote }) => {
    setAgencyApprovals((prev) => ({
      ...prev,
      Q3_2026: {
        isApproved: true,
        decisionNumber: decisionNumber || '128/QĐ-BQL',
        approvalDate: new Date().toLocaleDateString('vi-VN'),
        councilNote:
          councilNote ||
          'Hội đồng đánh giá thống nhất biểu quyết 100% công nhận kết quả thẩm định.',
        signer: 'Lê Hoàng Long - Phó Giám đốc Ban',
      },
    }));

    // Update all departments to APPROVED
    setDeptSummaries((prev) =>
      prev.map((d) => ({
        ...d,
        status: 'APPROVED',
      }))
    );

    // Update all staff to APPROVED
    setDeptStaff((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'APPROVED',
      }))
    );

    // Update personal KPIs to AGENCY_APPROVED
    setPersonalKPIs((prev) =>
      prev.map((kpi) => ({
        ...kpi,
        status: 'AGENCY_APPROVED',
      }))
    );
  };

  const resetAllData = () => {
    setPersonalKPIs(INITIAL_PERSONAL_KPIS);
    setDeptStaff(INITIAL_DEPT_STAFF);
    setDeptSummaries(INITIAL_DEPT_SUMMARIES);
    setAgencyApproval({
      isApproved: false,
      decisionNumber: '128/QĐ-BQL',
      approvalDate: null,
      councilNote:
        'Hội đồng đánh giá thống nhất biểu quyết 100% công nhận kết quả thẩm định.',
      signer: 'Lê Hoàng Long - Phó Giám đốc Ban',
    });
  };

  const value = {
    personalKPIs,
    deptStaff,
    deptSummaries,
    agencyApproval,
    updateKPIProgress,
    submitSelfEvaluation,
    submitAllSelfEvaluations,
    gradeStaff,
    submitDeptToCouncil,
    approveAgencyResults,
    resetAllData,
  };

  return <KPIContext.Provider value={value}>{children}</KPIContext.Provider>;
}

KPIProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useKPI() {
  const context = useContext(KPIContext);
  if (!context) {
    throw new Error('useKPI must be used within a KPIProvider');
  }
  return context;
}
