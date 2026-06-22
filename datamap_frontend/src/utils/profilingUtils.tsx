import { AlertTriangle, XCircle } from "lucide-react";
import TableProfilingDisplay from "../components/TableProfilingDisplay";
import EmptyState from "../components/EmptyState";

interface RenderStep7ContentProps {
  initialMessageData: any[];
  dataDictionaryJson: any;
  dataDictionaryState?: any;
  anomalyData: any;
  similarityResponse: string;
  skippedSteps: Set<number>;
  setCurrentStep: (step: number) => void;
  exportRef?: React.RefObject<(() => void) | null>;
}

export const resolveDataDictionaryPayload = (
  dataDictionaryJson: any,
  dataDictionaryState?: any,
) => {
  const candidate = dataDictionaryJson ?? dataDictionaryState?.json ?? dataDictionaryState?.resultData;
  if (!candidate) {
    return null;
  }
  if (Array.isArray(candidate)) {
    if (candidate.length === 0) {
      return null;
    }
    if (typeof candidate[0] === "object" && !Array.isArray(candidate[0])) {
      return [candidate];
    }
    return candidate;
  }
  if (typeof candidate === "object") {
    if (Array.isArray(candidate.result) && candidate.result.length > 0) {
      return [candidate.result];
    }
    return [candidate];
  }
  return null;
};

export const renderStep7Content = ({
  initialMessageData,
  dataDictionaryJson,
  dataDictionaryState,
  anomalyData,
  similarityResponse,
  skippedSteps,
  setCurrentStep,
  exportRef,
}: RenderStep7ContentProps) => {
  const resolvedDataDictionary = resolveDataDictionaryPayload(dataDictionaryJson, dataDictionaryState);

  if (initialMessageData.length > 0 && resolvedDataDictionary) {
    return (
      <TableProfilingDisplay
        profilingData={initialMessageData}
        dataDictionary={resolvedDataDictionary}
        anomalyData={anomalyData}
        similarityData={similarityResponse}
        isStep4Skipped={skippedSteps.has(4)}
        exportRef={exportRef}
      />
    );
  }
  
  if (initialMessageData.length === 0) {
    return (
      <EmptyState
        icon={XCircle}
        title="Missing Profiling Data"
        description="Cannot display detailed profiling without initial data."
        iconColor="text-red-500"
        bgColor="bg-red-50"
        borderColor="border-red-200"
        titleColor="text-red-700"
        descColor="text-red-600"
        action={
          <button
            onClick={() => setCurrentStep(1)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Return to Dataset Overview
          </button>
        }
      />
    );
  }
  
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Data Dictionary Required"
      description="Please complete the Data Dictionary step first."
      iconColor="text-yellow-500"
      bgColor="bg-yellow-50"
      borderColor="border-yellow-200"
      titleColor="text-yellow-700"
      descColor="text-yellow-600"
      action={
        <button
          onClick={() => setCurrentStep(3)}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Go to Data Dictionary
        </button>
      }
    />
  );
};
