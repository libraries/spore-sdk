import { helpers } from '@ckb-lumos/lumos';
import { generateTypeIdsByOutputs } from '../../../helpers';
import { getSporeConfig, getSporeScript, isSporeScriptSupported, SporeConfig } from '../../../config';

export function injectNewSporeIds(props: {
  txSkeleton: helpers.TransactionSkeletonType;
  outputIndices: number[];
  config?: SporeConfig;
}): helpers.TransactionSkeletonType {
  // Env
  const config = props.config ?? getSporeConfig();

  // Get TransactionSkeleton
  let txSkeleton = props.txSkeleton;

  // Get the first input
  const inputs = txSkeleton.get('inputs');
  const firstInput = inputs.get(0);
  if (!firstInput) {
    throw new Error('Cannot generate Spore Id because Transaction.inputs[0] does not exist');
  }

  // Get SporeType script
  const sporeScript = getSporeScript(config, 'Spore');

  // Calculates TypeIds by the outputs' indices
  let outputs = txSkeleton.get('outputs');
  let typeIdGroup = generateTypeIdsByOutputs(firstInput, outputs.toArray(), (cell) => {
    return !!cell.cellOutput.type && isSporeScriptSupported(sporeScript, cell.cellOutput.type);
  });

  // If `sporeOutputIndices` is provided, filter the result
  if (props.outputIndices) {
    typeIdGroup = typeIdGroup.filter(([outputIndex]) => {
      const index = props.outputIndices!.findIndex((index) => index === outputIndex);
      return index >= 0;
    });
    if (typeIdGroup.length !== props.outputIndices.length) {
      throw new Error('Cannot generate Spore Id because sporeOutputIndices cannot be fully handled');
    }
  }

  for (const [index, typeId] of typeIdGroup) {
    const output = outputs.get(index);
    if (!output) {
      throw new Error(`Cannot generate Spore Id because Transaction.outputs[${index}] does not exist`);
    }

    output.cellOutput.type!.args = typeId;
    outputs = outputs.set(index, output);
  }

  return txSkeleton.set('outputs', outputs);
}
