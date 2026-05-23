import { distance, point } from "@turf/turf";

import {
  getAssetById,
  getIssuesForAsset,
  type DemoIssue,
  type LngLat,
  seedIssues,
  severityRank,
} from "@/data/presidio-demo";

export const NEARBY_ISSUE_RADIUS_METERS = 95;

export function metersBetween(from: LngLat, to: LngLat) {
  return (
    distance(point(from), point(to), {
      units: "kilometers",
    }) * 1000
  );
}

export function sortIssuesByOperationalPriority(issues: DemoIssue[]) {
  return [...issues].sort((left, right) => {
    const severityDelta =
      severityRank[right.severity] - severityRank[left.severity];

    if (severityDelta !== 0) {
      return severityDelta;
    }

    return right.priorityScore - left.priorityScore;
  });
}

export function getNearbyOpenIssues(
  assetId: string,
  issues = seedIssues,
  radiusMeters = NEARBY_ISSUE_RADIUS_METERS,
) {
  const asset = getAssetById(assetId);

  if (!asset) {
    return [];
  }

  const nearbyIssues = issues.filter((issue) => {
    if (issue.assetId === assetId || issue.status === "resolved") {
      return false;
    }

    return metersBetween(asset.coordinates, issue.coordinates) <= radiusMeters;
  });

  return sortIssuesByOperationalPriority(nearbyIssues);
}

export function buildAssetOperationsContext(assetId: string, issues = seedIssues) {
  const asset = getAssetById(assetId);

  if (!asset) {
    return null;
  }

  const openIssues = sortIssuesByOperationalPriority(
    getIssuesForAsset(assetId, issues),
  );
  const nearbyIssues = getNearbyOpenIssues(assetId, issues);
  const issueCount = openIssues.length + nearbyIssues.length;
  const highestSeverity =
    sortIssuesByOperationalPriority([...openIssues, ...nearbyIssues])[0]
      ?.severity ?? "low";

  return {
    asset,
    openIssues,
    nearbyIssues,
    issueCount,
    highestSeverity,
  };
}
