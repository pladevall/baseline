'use client';

import { useState } from 'react';
import { BIAEntry } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface ManualEntryFormProps {
  onSave: (entry: BIAEntry) => void;
  onCancel: () => void;
}

export default function ManualEntryForm({ onSave, onCancel }: ManualEntryFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [values, setValues] = useState({
    fitnessScore: '',
    weight: '',
    bmi: '',
    bodyFatPercentage: '',
    visceralFat: '',
    skeletalMuscle: '',
    bodyWater: '',
    protein: '',
    boneMass: '',
    bodyFatMass: '',
    lbm: '',
    bmr: '',
    metabolicAge: '',
  });

  const handleChange = (field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const entry: BIAEntry = {
      id: uuidv4(),
      date: new Date(date).toISOString(),
      name: 'Manual Entry',
      age: 0,
      gender: '',
      height: '',
      fitnessScore: parseFloat(values.fitnessScore) || 0,
      weight: parseFloat(values.weight) || 0,
      bmi: parseFloat(values.bmi) || 0,
      bodyFatPercentage: parseFloat(values.bodyFatPercentage) || 0,
      visceralFat: parseFloat(values.visceralFat) || 0,
      skeletalMuscle: parseFloat(values.skeletalMuscle) || 0,
      bodyWater: parseFloat(values.bodyWater) || 0,
      protein: parseFloat(values.protein) || 0,
      boneMass: parseFloat(values.boneMass) || 0,
      bodyFatMass: parseFloat(values.bodyFatMass) || 0,
      softLeanMass: 0,
      fatFreeMass: 0,
      lbm: parseFloat(values.lbm) || 0,
      bmr: parseFloat(values.bmr) || 0,
      metabolicAge: parseInt(values.metabolicAge) || 0,
      subcutaneousFatPercentage: 0,
      muscleMassPercentage: 0,
      skeletalMusclePercentage: 0,
      boneMassPercentage: 0,
      proteinPercentage: 0,
      bodyWaterPercentage: 0,
      smi: 0,
      waistHipRatio: 0,
      muscleLeftArm: { lb: 0, percent: 0 },
      muscleRightArm: { lb: 0, percent: 0 },
      muscleTrunk: { lb: 0, percent: 0 },
      muscleLeftLeg: { lb: 0, percent: 0 },
      muscleRightLeg: { lb: 0, percent: 0 },
      fatLeftArm: { lb: 0, percent: 0 },
      fatRightArm: { lb: 0, percent: 0 },
      fatTrunk: { lb: 0, percent: 0 },
      fatLeftLeg: { lb: 0, percent: 0 },
      fatRightLeg: { lb: 0, percent: 0 },
      bodyShape: '',
      bmiCategory: '',
      pbfCategory: '',
      normalWeight: 0,
      weightControl: 0,
      fatMassControl: 0,
      muscleControl: 0,
    };

    onSave(entry);
  };

  const fields = [
    { key: 'fitnessScore', label: 'Fitness Score', unit: '/100' },
    { key: 'weight', label: 'Weight', unit: 'lb' },
    { key: 'bmi', label: 'BMI', unit: 'kg/m²' },
    { key: 'bodyFatPercentage', label: 'Body Fat %', unit: '%' },
    { key: 'visceralFat', label: 'Visceral Fat', unit: '' },
    { key: 'skeletalMuscle', label: 'Skeletal Muscle', unit: 'lb' },
    { key: 'bodyWater', label: 'Body Water', unit: 'L' },
    { key: 'protein', label: 'Protein', unit: 'lb' },
    { key: 'boneMass', label: 'Bone Mass', unit: 'lb' },
    { key: 'bodyFatMass', label: 'Body Fat Mass', unit: 'lb' },
    { key: 'lbm', label: 'LBM (Lean Body Mass)', unit: 'lb' },
    { key: 'bmr', label: 'BMR', unit: 'kcal' },
    { key: 'metabolicAge', label: 'Metabolic Age', unit: 'years' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.unit && <span className="text-gray-400">({field.unit})</span>}
            </label>
            <input
              type="number"
              step="0.1"
              value={values[field.key as keyof typeof values]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Entry
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
