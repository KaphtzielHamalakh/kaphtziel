"""Retain complete original source-unit coverage without splitting compounds."""
def source_unit_inventory(source):
    categories = {c['id']: c for c in source['categories']}
    result = {'sourceUnits': {}, 'unitsWithSeparateVowelCategory': {}, 'sourceUnitsWithMarkedDifferences': {}, 'unsplitCompounds': {}}
    for style in ['sephardic', 'ashkenazic']:
        total = separate = position = differences = 0
        pending = []
        for group in source['groups']:
            assert len(group['rows']) == 1
            cells = group['rows'][0]['styles'][style]
            assert len(cells) == 1
            for unit in cells[0]['units']:
                total += 1
                variants = unit['sourceSegments']['variants']
                assert len(variants) == 1
                variant = variants[0]
                if variant['sourceHebrew']['text'] != ''.join(r['text'] for r in variant['readerRanges'] if r['role'] == 'written'):
                    differences += 1
                segments = variant['segments']
                vowels = [s for s in segments if categories[s['categoryId']]['kind'] == 'vowel'
                          or (categories[s['categoryId']]['kind'] == 'diphthong-part'
                              and s['categoryId'] != 'YOD_0DAG_PART2_OF_DIPHTHONG')]
                if vowels:
                    assert len(vowels) == 1, 'Multiple vowel categories require separate source treatment.'
                    separate += 1
                else:
                    assert len(segments) == 1 and segments[0]['categoryId'].startswith('FPP_PATAX_'), 'Do not drop a source unit without a separate vowel category.'
                    segment = segments[0]
                    category = categories[segment['categoryId']]
                    assert segment['readerWordId'] == unit['readerWordId'] and unit['readerWordId'] is not None
                    assert segment['part'] == 'whole' and segment['sharedWithUnitId'] is None
                    pending.append({'sourceSegmentId': segment['id'], 'sourcePosition': position,
                                    'categoryId': category['id'], 'categoryLabel': category['label'],
                                    'categoryKind': category['kind'], 'wordId': unit['readerWordId'],
                                    'sourceUnitId': unit['id'], 'sourceUnitText': unit['text'],
                                    'sourceStress': unit['sourceStress'],
                                    'sourceRealization': segment['realizations'][style],
                                    'sourceHebrew': variant['sourceHebrew'],
                                    'parentSyllableReaderRanges': variant['readerRanges'],
                                    'sourceMarkedTextEqualsWrittenRanges': variant['sourceHebrew']['text'] == ''.join(r['text'] for r in variant['readerRanges'] if r['role'] == 'written'),
                                    'individualVowelPointRange': None, 'phonemes': None,
                                    'audioTimes': None, 'quantity': None, 'review': None})
                position += len(segments)
        assert total == separate + len(pending)
        result['sourceUnits'][style] = total
        result['unitsWithSeparateVowelCategory'][style] = separate
        result['sourceUnitsWithMarkedDifferences'][style] = differences
        result['unsplitCompounds'][style] = pending
    return result
