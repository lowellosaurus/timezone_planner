<?php

error_reporting(E_ALL);
ini_set("display_errors", 1);

// Build a map between letters and their hex-coded equivalents in the flag
// unicode characters to enable conversion between country codes and flags.
$LETTER_SUFFIX_MAP = [];
$HEX_OFFSET = 230;
foreach (range('A', 'Z') as $index => $letter) {
    $LETTER_SUFFIX_MAP[$letter] = strtoupper(dechex($HEX_OFFSET + $index));
}

// https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements
// Copied table, manually cleaned up notes, used sed to constrain the line to
// only the country code and name: s/\t\d\d\d\d.*$//g

$FLAG_CHAR_PREFIX = '&#x1F1';
$country_timezones = [];
$FILE = 'abbr_list.txt';
$fh = fopen($FILE, 'r');
if ($fh) {
    while ($line = fgets($fh)) {
        list($abbr, $country_name) = preg_split('/\s/', $line, 2);
        $country_name = getShortCountryName( trim($country_name) );    

        // Unicode characters for flags are made up of the country's two letter 
        // ISO 3166-1 alpha-2 code with each letter prefixed by "&#x1F1".
        $flag = '';
        foreach ( str_split($abbr) as $index => $letter ) {
            $flag .= $FLAG_CHAR_PREFIX . $LETTER_SUFFIX_MAP[strtoupper($letter)] . ';';
        }

        $timezones = DateTimeZone::listIdentifiers(DateTimeZone::PER_COUNTRY, $abbr);

        if (count($timezones) === 0) continue;

        if (count($timezones) < 2) {
            $country_timezones[makeSimpleKey($country_name)] = [
                'flag'   => $flag,
                'title'  => $country_name,
                'offset' => getTzOffsetHours($timezones[0]),
            ];

            continue;
        }

        foreach ($timezones as $index => $tz_name) {
            $tz_name_components = preg_split('/\//', $tz_name);
            $common_tz_name = end($tz_name_components);
            $common_tz_name = preg_replace('/_/', ' ', $common_tz_name);
            $country_timezones[makeSimpleKey($country_name . " $common_tz_name")] = [
                'flag'   => $flag,
                'title'  => $country_name . " ($common_tz_name)",
                'offset' => getTzOffsetHours($tz_name),
            ];
        }
    }
    fclose($fh);
}
else {
    exit("could not open file $FILE");
}

ksort($country_timezones);

echo "function TimeZoneList () {\n";
echo "    return ";
echo json_encode($country_timezones, JSON_PRETTY_PRINT);
echo ";\n";
echo "}\n";

function makeSimpleKey ($key) {
    // Remove all non-word characters.
    $key = preg_replace('/[^\w\s]/', '', $key);

    // Replace space characters with underscores.
    $key = preg_replace('/\s+/', '_', $key);

    // I'm not entirely sure why we need iconv() but trial and error doesn't
    // lie. preg_replace() changed the encoding or something? json_encode()
    // choked when it was presented with non-utf8 characters. 
    return iconv('ISO-8859-1', 'UTF-8', strtolower($key));
}

function getTzOffsetHours ($tz) {
    $datetimezone = new DateTimeZone($tz);
    $datetime = new DateTime('now', $datetimezone);
    return $datetimezone->getOffset($datetime) / (60 * 60);
}

function getShortCountryName ($longname) {
    $SHORT_NAME_FOR = [
        'Bonaire, Sint Eustatius and Saba'      => 'Caribbean Netherlands',
        'Congo, the Democratic Republic of the' => 'Democratic Republic of Congo',
        'Micronesia, Federated States of'       => 'Micronesia',
        'United Kingdom of Great Britain and Northern Ireland' => 'United Kingdom',
        'United States of America'              => 'United States',
    ];

    return isset($SHORT_NAME_FOR[$longname]) ? $SHORT_NAME_FOR[$longname] : $longname;
}