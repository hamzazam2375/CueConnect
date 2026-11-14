// every branch is shown to customers under the club's GOODSHOT name, e.g. "GOODSHOT IQBAL TOWN"
export const formatBranchName = (branch) => {
    const name = branch?.branchName || "";
    const upper = name.trim().toUpperCase();
    return upper.startsWith("GOODSHOT") ? upper : `GOODSHOT ${upper}`.trim();
};
